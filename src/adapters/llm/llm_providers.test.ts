import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock configuration
vi.mock("../../config/index.js", () => ({
    appConfig: {
        llm: {
            groqApiKey: "g-key",
            openrouterApiKey: "or-key",
            ollamaBaseUrl: "http://localhost:11434"
        }
    }
}));

import { GroqProvider } from "./GroqProvider.js";
import { OpenRouterProvider } from "./OpenRouterProvider.js";
import { OllamaProvider } from "./OllamaProvider.js";

describe("LLM Providers", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("GroqProvider should format and send chat requests", async () => {
        const provider = new GroqProvider("llama-model");
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{ message: { role: "assistant", content: "Hi from Groq" } }]
            })
        });

        const res = await provider.chat([{ role: "user", content: "Hello" }]);
        expect(res.content).toBe("Hi from Groq");
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("groq.com"),
            expect.objectContaining({ method: "POST" })
        );
    });

    it("OpenRouterProvider should handle tool_calls in response", async () => {
        const provider = new OpenRouterProvider("or-model");
        const toolCall = { id: "1", type: "function", function: { name: "test", arguments: "{}" } };
        
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{ message: { role: "assistant", content: null, tool_calls: [toolCall] } }]
            })
        });

        const res = await provider.chat([{ role: "user", content: "Tool?" }]);
        expect(res.tool_calls).toHaveLength(1);
        expect(res.tool_calls![0].function.name).toBe("test");
    });

    it("OllamaProvider should handle local generation", async () => {
        const provider = new OllamaProvider("http://localhost:11434", "llama3");
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                message: { role: "assistant", content: "Local hi" }
            })
        });

        const res = await provider.chat([{ role: "user", content: "Local?" }]);
        expect(res.content).toBe("Local hi");
        expect(mockFetch).toHaveBeenCalledWith(
            "http://localhost:11434/api/chat",
            expect.any(Object)
        );
    });
});
