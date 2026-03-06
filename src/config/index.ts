import { config } from "dotenv";

config();

function getEnv(key: string, required: boolean = false): string {
    const value = process.env[key];
    if (required && !value) {
        throw new Error(`Falta configurar la variable de entorno obligatoria: ${key}`);
    }
    return value || "";
}

export const appConfig = {
    telegramToken: getEnv("TELEGRAM_BOT_TOKEN", true),
    allowedUserIds: getEnv("TELEGRAM_ALLOWED_USER_IDS", true)
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id)),
    llm: {
        provider: getEnv("DEFAULT_LLM_PROVIDER") || "groq",
        groqModel: getEnv("GROQ_MODEL") || "llama-3.3-70b-versatile",
        openrouterModel: getEnv("OPENROUTER_MODEL") || "google/gemini-2.0-flash-thinking-exp:free",
        openrouterEmbeddingModel: getEnv("OPENROUTER_EMBEDDING_MODEL") || "google/text-embedding-004",
        ollamaModel: getEnv("OLLAMA_MODEL") || "llama3.3",
        groqApiKey: getEnv("GROQ_API_KEY"),
        openrouterApiKey: getEnv("OPENROUTER_API_KEY"),
        ollamaBaseUrl: getEnv("OLLAMA_BASE_URL", false) || "http://127.0.0.1:11434"
    },
    dbPath: getEnv("DB_PATH") || "./data/chochibot.sqlite",
    fsPaths: getEnv("ALLOWED_FS_PATHS")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
    vscodePath: getEnv("VSCODE_PATH") || "code",
    notion: {
        apiKey: getEnv("NOTION_API_KEY"),
        defaultDatabaseId: getEnv("NOTION_DATABASE_ID")
    },
    githubToken: getEnv("GITHUB_TOKEN"),
    vps: {
        ip: getEnv("VPS_IP"),
        user: getEnv("VPS_USER"),
        port: parseInt(getEnv("VPS_PORT") || "22", 10),
        password: getEnv("VPS_PASSWORD")
    }
};
