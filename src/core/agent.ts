import { LLMMessage, LLMProvider } from "../adapters/llm/LLMProvider.js";
import { toolsRegistry, getToolsDefinitions } from "../tools/index.js";
import { logToolUsage } from "../adapters/logger/index.js";
import { getEmbedding } from "./embeddings.js";
import { searchSemanticMemories } from "../memory/db.js";

const MAX_ITERATIONS = 10;

export class AgentLoop {
    constructor(private llm: LLMProvider) {}

    async run(messages: LLMMessage[], userId: number): Promise<{ 
        response: LLMMessage, 
        pausedForApproval?: any, 
        currentTurnTools?: LLMMessage[] 
    }> {
        let iterations = 0;
        let currentMessages = [...messages];
        let currentTurnTools: LLMMessage[] = [];

        // --- RAG (Retrieval-Augmented Generation) ---
        // Buscamos memorias relevantes basándonos en el último mensaje del usuario
        const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
        if (lastUserMsg && lastUserMsg.content) {
            try {
                const queryVector = await getEmbedding(lastUserMsg.content);
                const relevantMemories = searchSemanticMemories(queryVector, 3);
                
                if (relevantMemories.length > 0) {
                    const contextText = relevantMemories
                        .map(m => `- ${m.content}`)
                        .join("\n");
                    
                    const ragPrompt = `\n[CONTEXTO RELEVANTE RECUPERADO DE TU MEMORIA]:\n${contextText}\nUse this context if it helps to answer the user accurately.`;
                    
                    // Inyectamos el contexto en el system prompt o como un mensaje de sistema adicional
                    const systemMsg = currentMessages.find(m => m.role === "system");
                    if (systemMsg) {
                        systemMsg.content += ragPrompt;
                    }
                }
            } catch (e) {
                console.error("Error en RAG:", e);
                // Continuamos sin RAG si falla para no romper la experiencia
            }
        }

        while (iterations < MAX_ITERATIONS) {
            iterations++;
            
            // 1. Call LLM
            const assistantMessage = await this.llm.chat(currentMessages, getToolsDefinitions());

            // 2. Check for tool calls
            const toolCalls = assistantMessage.tool_calls;
            if (!toolCalls || toolCalls.length === 0) {
                // Done - no tools requested
                return { response: assistantMessage };
            }

            // Add the assistant's thought process to local loop memory
            currentMessages.push(assistantMessage);

            let requiresApproval = null;
            
            for (const call of toolCalls) {
                if (call.type !== "function") continue;
                
                const fnName = call.function.name;
                const toolArgs = JSON.parse(call.function.arguments);
                const toolDef = toolsRegistry.find((t) => t.name === fnName);

                try {
                    if (!toolDef) throw new Error(`Tool ${fnName} not found.`);

                    // Pass userId to the tool handler for context
                    const result = await toolDef.handler({ ...toolArgs, userId });
                    
                    // 3. Handle PAUSE for Human Approval
                    if (result && typeof result === "object" && "status" in result && result.status === "pending_human_approval") {
                        requiresApproval = {
                            toolCallId: call.id,
                            toolName: fnName,
                            toolArgs,
                            message: result.message || "Requiere confirmación"
                        };
                        
                        // We do NOT push this "pending" status to global history yet.
                        // We return to inform the adapter (Telegram) to show buttons.
                        continue;
                    }

                    // 4. Handle tool SUCCESS/ERROR
                    const outputText = JSON.stringify(result);
                    const toolResultMsg: LLMMessage = {
                        role: "tool",
                        content: outputText,
                        name: fnName,
                        tool_call_id: call.id
                    };
                    currentMessages.push(toolResultMsg);
                    currentTurnTools.push(toolResultMsg);
                    
                    logToolUsage(fnName, userId, JSON.stringify(toolArgs), outputText, "success");

                } catch (error: any) {
                    const toolResultMsg: LLMMessage = {
                        role: "tool",
                        content: `Error: ${error.message}`,
                        name: fnName,
                        tool_call_id: call.id
                    };
                    currentMessages.push(toolResultMsg);
                    currentTurnTools.push(toolResultMsg);
                    logToolUsage(fnName, userId, JSON.stringify(toolArgs), error.message, "error");
                }
            }

            // Terminate iteration if approval is needed
            if (requiresApproval) {
                return { response: assistantMessage, pausedForApproval: requiresApproval, currentTurnTools };
            }
        }

        return { response: { role: "assistant", content: "Límite de iteraciones alcanzado." } };
    }
}
