import { appConfig } from "./config/index.js";
import { initDb } from "./memory/db.js";
import { loadExternalSkills } from "./tools/index.js";
import { GroqProvider } from "./adapters/llm/GroqProvider.js";
import { AgentLoop } from "./core/agent.js";
import { createBot } from "./adapters/telegram/bot.js";

import { OpenRouterProvider } from "./adapters/llm/OpenRouterProvider.js";
import { OllamaProvider } from "./adapters/llm/OllamaProvider.js";

async function getLLMProvider() {
    console.log(`🤖 Buscando motor de Inteligencia Artificial (Preferencia: ${appConfig.llm.provider})...`);

    // Priorizar el proveedor configurado si existe
    if (appConfig.llm.provider === "openrouter" && appConfig.llm.openrouterApiKey) {
        console.log(`✅ ¡OpenRouter seleccionado manualmente con ${appConfig.llm.openrouterModel}!`);
        return new OpenRouterProvider(appConfig.llm.openrouterApiKey, appConfig.llm.openrouterModel);
    }
    
    if (appConfig.llm.provider === "groq" && appConfig.llm.groqApiKey) {
        console.log(`✅ ¡Groq seleccionado manualmente con ${appConfig.llm.groqModel}!`);
        return new GroqProvider(appConfig.llm.groqApiKey, appConfig.llm.groqModel);
    }

    // Si no hay preferencia o no funciona, probar el orden de siempre
    // 1. Intentar Ollama
    console.log(`Testando Ollama local: ${appConfig.llm.ollamaModel}...`);
    const ollamaProvider = new OllamaProvider(appConfig.llm.ollamaBaseUrl, appConfig.llm.ollamaModel);
    const hasOllama = await ollamaProvider.isAvailable();
    if (hasOllama) {
        console.log(`✅ ¡Ollama detectado localmente con el modelo ${appConfig.llm.ollamaModel}! Arrancando en 100% modo offline.`);
        return ollamaProvider;
    }

    // 2. Groq
    if (appConfig.llm.groqApiKey) {
        console.log(`✅ ¡Groq Provider seleccionado con modelo ${appConfig.llm.groqModel}!`);
        return new GroqProvider(appConfig.llm.groqApiKey, appConfig.llm.groqModel);
    }

    // 3. OpenRouter
    if (appConfig.llm.openrouterApiKey) {
        console.log(`✅ ¡OpenRouter seleccionado con modelo ${appConfig.llm.openrouterModel}!`);
        return new OpenRouterProvider(appConfig.llm.openrouterApiKey, appConfig.llm.openrouterModel);
    }

    throw new Error("❌ Error crítico: Ningún motor LLM ha podido inicializarse. Por favor revisa tu .env.");
}

async function main() {
    console.log("Inicializando base de datos...");
    initDb();
    await loadExternalSkills();

    const provider = await getLLMProvider();

    const agent = new AgentLoop(provider);
    
    console.log("Iniciando bot de Telegram...");
    const bot = createBot(agent);
    
    bot.catch((err) => {
        console.error("Error en bot de Telegram:", err);
    });

    await bot.start({
        onStart: (botInfo) => {
            console.log(`🚀 ChochiBot iniciado correctamente como @${botInfo.username}`);
        }
    });
}

main().catch(err => {
    console.error("Error fatal en startup:", err);
    process.exit(1);
});
