import { describe, it, expect, vi } from "vitest";

// Mock process.env
const originalEnv = process.env;

describe("App Config", () => {
    it("should load configuration from environment variables", async () => {
        vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
        vi.stubEnv("DEFAULT_LLM_PROVIDER", "groq");
        vi.stubEnv("GROQ_API_KEY", "groq-key");
        
        // Import dynamically to ensure env stubs are active
        const { appConfig } = await import("./index.js");
        
        expect(appConfig.telegramToken).toBe("test-token");
        expect(appConfig.llm.provider).toBe("groq");
        expect(appConfig.llm.groqApiKey).toBe("groq-key");
        
        vi.unstubAllEnvs();
    });

    it("should use default values when env vars are missing", async () => {
        vi.stubEnv("TELEGRAM_BOT_TOKEN", "fallback-token");
        // Reset modules to reload config
        vi.resetModules();
        
        const { appConfig } = await import("./index.js");
        
        expect(appConfig.llm.provider).toBeDefined(); // Should have a default like 'groq'
        expect(appConfig.dbPath).toContain("data/chochibot.sqlite");
        
        vi.unstubAllEnvs();
    });
});
