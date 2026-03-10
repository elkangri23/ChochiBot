// Suppress punycode deprecation warning from Node.js internals
process.removeAllListeners('warning');
process.on('warning', (warning) => {
    if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
        return; // Ignore punycode deprecation warnings
    }
    console.warn(warning.name, warning.message);
});

import { appConfig } from "./config/index.js";
import { initDb } from "./memory/db.js";
import { loadExternalSkills } from "./tools/index.js";
import { GroqProvider } from "./adapters/llm/GroqProvider.js";
import { AgentLoop } from "./core/agent.js";
import { createBot } from "./adapters/telegram/bot.js";

import { OpenRouterProvider } from "./adapters/llm/OpenRouterProvider.js";
import { OllamaProvider } from "./adapters/llm/OllamaProvider.js";

async function getLLMProvider() {
    console.log(`🤖 Buscando motor de Inteligencia Artificial (Preferencia: Ollama, Fallback: ${appConfig.llm.provider})...`);

    // 1. Intentar siempre Ollama primero (Hardcoded o desde env)
    console.log(`Testando Ollama local: ${appConfig.llm.ollamaModel}...`);
    const ollamaProvider = new OllamaProvider(appConfig.llm.ollamaBaseUrl, appConfig.llm.ollamaModel);
    const hasOllama = await ollamaProvider.isAvailable();
    if (hasOllama) {
        console.log(`✅ ¡Ollama detectado localmente con el modelo ${appConfig.llm.ollamaModel}! Arrancando en 100% modo offline.`);
        return ollamaProvider;
    }

    // Si Ollama falla, revisar preferencia configurada
    if (appConfig.llm.provider === "openrouter" && appConfig.llm.openrouterApiKey) {
        console.log(`✅ ¡OpenRouter seleccionado como fallback manual con ${appConfig.llm.openrouterModel}!`);
        return new OpenRouterProvider(appConfig.llm.openrouterApiKey, appConfig.llm.openrouterModel);
    }
    
    if (appConfig.llm.provider === "groq" && appConfig.llm.groqApiKey) {
        console.log(`✅ ¡Groq seleccionado como fallback manual con ${appConfig.llm.groqModel}!`);
        return new GroqProvider(appConfig.llm.groqApiKey, appConfig.llm.groqModel);
    }

    // Si no hay preferencia o falló, probar los demás
    // 2. Groq falló antes pero intentamos de nuevo si no había preferencia. Acá asumimos que si no es preferencia, aún funciona:
    if (appConfig.llm.groqApiKey) {
        console.log(`✅ ¡Groq Provider seleccionado como último fallback con modelo ${appConfig.llm.groqModel}!`);
        return new GroqProvider(appConfig.llm.groqApiKey, appConfig.llm.groqModel);
    }

    // 3. OpenRouter
    if (appConfig.llm.openrouterApiKey) {
        console.log(`✅ ¡OpenRouter seleccionado como último fallback con modelo ${appConfig.llm.openrouterModel}!`);
        return new OpenRouterProvider(appConfig.llm.openrouterApiKey, appConfig.llm.openrouterModel);
    }

    throw new Error("❌ Error crítico: Ningún motor LLM ha podido inicializarse. Asegúrate de configurar las API Keys o instalar el modelo de Ollama o correr su servicio localmente.");
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
