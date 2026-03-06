import { LLMMessage, LLMProvider, ToolDefinition } from "./LLMProvider.js";

export class OllamaProvider implements LLMProvider {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string, model: string) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        this.model = model;
    }

    async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMMessage> {
        const payload: any = {
            model: this.model,
            messages,
            stream: false,
            options: {
                temperature: 0.7
            }
        };

        if (tools && tools.length > 0) {
            payload.tools = tools;
        }

        const res = await fetch(`${this.baseUrl}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Ollama API Error: ${res.status} - ${err}`);
        }

        const data = await res.json() as any;
        // Ollama tool calls are returned slightly different, but the standard OpenAI-like format should map
        return data.message as LLMMessage;
    }

    async isAvailable(): Promise<boolean> {
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`);
            if (!res.ok) return false;
            const data = await res.json() as any;
            const models = data.models || [];
            return models.some((m: any) => m.name.startsWith(this.model) || m.name === this.model);
        } catch (error) {
            return false;
        }
    }
}
