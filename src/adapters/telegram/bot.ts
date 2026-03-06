import { Bot, Context, InlineKeyboard } from "grammy";
import { appConfig } from "../../config/index.js";
import { LLMMessage } from "../llm/LLMProvider.js";
import { AgentLoop } from "../../core/agent.js";
import { toolsRegistry } from "../../tools/index.js";
import { logToolUsage } from "../logger/index.js";
import { getSystemPrompt } from "../../core/prompts.js";

// Función para escapar caracteres de MarkdownV1 (el que usa parse_mode: "Markdown")
function escapeMarkdown(text: string): string {
    // MarkdownV1 es más permisivo pero a veces falla con caracteres anidados.
    // Para simplificar y corregir el error del usuario, escaparemos los caracteres problemáticos
    // que suelen romper el parseo si no tienen cierre.
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

// Session/Memory maps
const userHistories = new Map<number, LLMMessage[]>();
const pendingApprovals = new Map<string, { 
    userId: number, 
    toolName: string, 
    toolArgs: any, 
    history: LLMMessage[],
    assistantMessage: LLMMessage 
}>();

export function createBot(agent: AgentLoop) {
    if (!appConfig.telegramToken) {
        throw new Error("TELEGRAM_BOT_TOKEN missing");
    }

    const bot = new Bot(appConfig.telegramToken);

    bot.use(async (ctx, next) => {
        if (!ctx.from) return;
        if (!appConfig.allowedUserIds.includes(ctx.from.id)) {
            await ctx.reply("Usuario no autorizado.");
            return;
        }
        await next();
    });

    bot.command("start", async (ctx) => {
        await ctx.reply("¡Hola! Soy ChochiBot, tu agente de IA personal. Fase 2: Aprobaciones interactivas activas. 🚀");
    });

    bot.command("config", async (ctx) => {
        await ctx.reply(`LLM Provider actual: ${appConfig.llm.provider}\nModo: ${appConfig.llm.ollamaModel || appConfig.llm.groqModel}`);
    });

    bot.command("tools", async (ctx) => {
        await ctx.reply("Herramientas: get_current_time, shell_secure, filesystem, http_client, pc_integration");
    });

    bot.command("develop", async (ctx) => {
        const query = ctx.match;
        if (!query) return ctx.reply("Uso: /develop <objetivo>");
        const prompt = `Eres el modo planner. Genera un plan para: ${query}. Solicita herramientas si es necesario.`;
        await handleAgentExecution(ctx, agent, prompt, ctx.from!.id);
    });

    // Handler para botones de aprobación
    bot.callbackQuery(/approve:(.+)/, async (ctx) => {
        const toolCallId = ctx.match[1];
        const pending = pendingApprovals.get(toolCallId);
        if (!pending) return ctx.answerCallbackQuery("Esta aprobación ha expirado.");

        await ctx.answerCallbackQuery("Ejecutando herramienta...");
        await ctx.editMessageText("✅ Aprobado. Ejecutando...");

        try {
            const toolDef = toolsRegistry.find(t => t.name === pending.toolName);
            if (!toolDef) throw new Error("Herramienta no encontrada");

            // Ejecución REAL con bypassApproval
            const result = await toolDef.handler({ ...pending.toolArgs, bypassApproval: true });
            
            // --- PERSISTENCIA DE RESULTADO ---
            const toolOutput = JSON.stringify(result);
            pending.history.push({
                role: "tool",
                content: toolOutput,
                name: pending.toolName,
                tool_call_id: toolCallId
            });
            logToolUsage(pending.toolName, pending.userId, JSON.stringify(pending.toolArgs), toolOutput, "success");

            // Limpiar pendiente
            pendingApprovals.delete(toolCallId);

            // Reanudar Agente
            await resumeAgentExecution(ctx, agent, pending.history, pending.userId);

        } catch (e: any) {
            await ctx.reply(`Error al ejecutar: ${e.message}`);
        }
    });

    bot.callbackQuery(/reject:(.+)/, async (ctx) => {
        const toolCallId = ctx.match[1];
        const pending = pendingApprovals.get(toolCallId);
        if (!pending) return ctx.answerCallbackQuery("Esta aprobación ha expirado.");

        await ctx.answerCallbackQuery("Acción rechazada.");
        await ctx.editMessageText("❌ Acción cancelada por el usuario.");

        // Persistimos solo el tool con error para denegar
        pending.history.push({
            role: "tool",
            content: JSON.stringify({ status: "denied", message: "El usuario ha rechazado la ejecución de esta herramienta." }),
            name: pending.toolName,
            tool_call_id: toolCallId
        });

        pendingApprovals.delete(toolCallId);
        await resumeAgentExecution(ctx, agent, pending.history, pending.userId);
    });

    bot.on("message:text", async (ctx) => {
        await handleAgentExecution(ctx, agent, ctx.message.text, ctx.from.id);
    });

    return bot;
}

import { getOrCreateUser, getMemories } from "../../memory/db.js";

async function handleAgentExecution(ctx: Context, agent: AgentLoop, text: string, userId: number, isPlanner: boolean = false) {
    // 1. Obtener/Crear usuario en la base de datos
    const user = getOrCreateUser(userId, ctx.from?.first_name || "Colega");
    const memories = getMemories(user.id);
    const memoryString = memories.map(m => `- [${m.type}]: ${m.content}`).join("\n");

    if (!userHistories.has(userId) || isPlanner) {
        userHistories.set(userId, [
            { 
                role: "system", 
                content: getSystemPrompt(memoryString, isPlanner)
            }
        ]);
    }

    const history = userHistories.get(userId)!;
    history.push({ role: "user", content: text });

    const waitMsg = await ctx.reply("Chochi está hackeando el sistema... 💭⚡");

    try {
        const result = await agent.run(history, userId);
        
        if (result.pausedForApproval) {
            const { toolCallId, toolName, toolArgs, message } = result.pausedForApproval;
            
            // Persistir pensamiento y resultados parciales (si hay)
            history.push(result.response);
            if (result.currentTurnTools && result.currentTurnTools.length > 0) {
                history.push(...result.currentTurnTools);
            }
            
            pendingApprovals.set(toolCallId, { 
                userId, 
                toolName, 
                toolArgs, 
                history,
                assistantMessage: result.response 
            });

            const keyboard = new InlineKeyboard()
                .text("✅ ¡Dale caña! (Aprobar)", `approve:${toolCallId}`)
                .text("❌ Nah, mejor no (Rechazar)", `reject:${toolCallId}`);

            const emoji = toolName === 'shell_secure' ? '⚡' : (toolName === 'filesystem' ? '💾' : '⚙️');
            
            await ctx.api.editMessageText(
                ctx.chat!.id, 
                waitMsg.message_id, 
                `${emoji} *¡OJITO! CONTROL DE SEGURIDAD*\n\n` +
                `Oye jefe, necesito ejecutar \`${toolName}\` para seguir.\n\n` +
                `*Argumentos:* \`${JSON.stringify(toolArgs)}\` \n\n` +
                `_${escapeMarkdown(message)}_`,
                { reply_markup: keyboard, parse_mode: "Markdown" }
            );
            return;
        }

        if (result.response.content) {
            // Limpiamos el mensaje de "Pensando" y ponemos la respuesta final con estilo
            await ctx.api.editMessageText(
                ctx.chat!.id, 
                waitMsg.message_id, 
                result.response.content,
                { parse_mode: undefined }
            );
        }
        
        history.push(result.response);
        
    } catch (e: any) {
        await ctx.api.editMessageText(ctx.chat!.id, waitMsg.message_id, `💥 *¡Ups! Algo ha explotado:* \n\`${e.message}\``, { parse_mode: "Markdown" });
    }
}

async function resumeAgentExecution(ctx: Context, agent: AgentLoop, history: LLMMessage[], userId: number) {
    const waitMsg = await ctx.reply("Permiso concedido. Volviendo a la carga... 🔄🚀");
    try {
        const result = await agent.run(history, userId);
        
        if (result.pausedForApproval) {
            const { toolCallId, toolName, toolArgs, message } = result.pausedForApproval;
            
            // Persistir pensamiento y resultados parciales (si hay)
            history.push(result.response);
            if (result.currentTurnTools && result.currentTurnTools.length > 0) {
                history.push(...result.currentTurnTools);
            }

            pendingApprovals.set(toolCallId, { 
                userId, 
                toolName, 
                toolArgs, 
                history,
                assistantMessage: result.response 
            });
            const keyboard = new InlineKeyboard()
                .text("✅ Dale caña", `approve:${toolCallId}`)
                .text("❌ Stop", `reject:${toolCallId}`);

            const emoji = toolName === 'shell_secure' ? '⚡' : '⚙️';

            await ctx.api.editMessageText(ctx.chat!.id, waitMsg.message_id, 
                `${emoji} *OTRA PETICIÓN EN COLA*\n\n` +
                `Esto se complica, necesito otro permiso para \`${toolName}\`:\n\n` +
                `_${escapeMarkdown(message)}_`,
                { reply_markup: keyboard, parse_mode: "Markdown" });
            return;
        }

        if (result.response.content) {
            await ctx.api.editMessageText(
                ctx.chat!.id, 
                waitMsg.message_id, 
                result.response.content,
                { parse_mode: undefined }
            );
        }
        history.push(result.response);
    } catch (e: any) {
        await ctx.reply(`❌ *Vaya... algo ha ido mal al reanudar:* \`${e.message}\``, { parse_mode: "Markdown" });
    }
}
