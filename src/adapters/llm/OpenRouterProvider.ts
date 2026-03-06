import { LLMMessage, LLMProvider, ToolDefinition } from "./LLMProvider.js";

export class OpenRouterProvider implements LLMProvider {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = "meta-llama/llama-3-8b-instruct") {
        this.apiKey = apiKey;
        this.model = model;
    }

    async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMMessage> {
        const payload: any = {
            model: this.model,
            messages,
            temperature: 0.7
        };
        
        if (tools && tools.length > 0) {
            payload.tools = tools;
            payload.tool_choice = "auto";
        }

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`,
                "HTTP-Referer": "http://localhost",
                "X-Title": "ChochiBot"
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`OpenRouter API Error: ${res.status} - ${err}`);
        }

        const data = await res.json() as any;
        return data.choices[0].message as LLMMessage;
    }
}
