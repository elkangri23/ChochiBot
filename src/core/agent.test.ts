import { describe, it, expect, vi } from "vitest";
import { AgentLoop } from "./agent.js";
import { LLMMessage, LLMProvider } from "../adapters/llm/LLMProvider.js";

// Mock logToolUsage to avoid side effects with db connections
vi.mock("../adapters/logger/index.js", () => ({
    logToolUsage: vi.fn()
}));

// Mock config
vi.mock("../config/index.js", () => ({
    appConfig: {
        telegramToken: "test-token",
        allowedUserIds: [12345678],
        llm: { 
            provider: "groq", 
            groqModel: "test-groq", 
            openrouterModel: "test-or", 
            ollamaModel: "test-ollama" 
        }, 
        dbPath: ":memory:",
        fsPaths: ["C:/Temp"], 
        vscodePath: "code" 
    }
}));

class MockLLM implements LLMProvider {
    responses: LLMMessage[];
    constructor(responses: LLMMessage[]) {
        this.responses = this.deepClone(responses);
    }
    
    // helper clone
    deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    async chat(messages: LLMMessage[], tools?: any): Promise<LLMMessage> {
        if (this.responses.length === 0) {
            return { role: "assistant", content: "Agent completed flow" };
        }
        return this.responses.shift() as LLMMessage;
    }
}

describe("AgentLoop", () => {
    it("should process standard text message without tool calls", async () => {
        const mockResponses: LLMMessage[] = [
            { role: "assistant", content: "Hola, ¿en qué te ayudo?" }
        ];
        
        const agent = new AgentLoop(new MockLLM(mockResponses));
        const result = await agent.run([{ role: "user", content: "Hola" }], 1);
        
        expect(result.response.content).toBe("Hola, ¿en qué te ayudo?");
        expect(result.pausedForApproval).toBeUndefined();
    });

    it("should intercept pending_human_approval status and pause the loop", async () => {
        const mockResponses: LLMMessage[] = [
            {
                role: "assistant",
                content: "",
                tool_calls: [
                    {
                        id: "call_abc123",
                        type: "function",
                        function: {
                            name: "shell_secure",
                            arguments: JSON.stringify({ command: "rm -rf folder" })
                        }
                    }
                ]
            }
        ];
        
        const agent = new AgentLoop(new MockLLM(mockResponses));
        const result = await agent.run([{ role: "user", content: "Borra la carpeta" }], 2);
        
        // El agente debería detectar que requiere aprobación y pausarse
        expect(result.pausedForApproval).toBeDefined();
        expect(result.pausedForApproval!.toolName).toBe("shell_secure");
        expect(result.pausedForApproval!.toolArgs.command).toBe("rm -rf folder");
    });
});
