import { LLMMessage, LLMProvider, ToolDefinition } from "./LLMProvider.js";

export class GroqProvider implements LLMProvider {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = "llama-3.1-70b-versatile") {
        this.apiKey = apiKey;
        this.model = model;
    }

    async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMMessage> {
        const payload: any = {
            model: this.model,
            messages,
            temperature: 0.1
        };
        
        if (tools && tools.length > 0) {
            payload.tools = tools;
            payload.tool_choice = "auto";
        }

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Groq API Error: ${res.status} - ${err}`);
        }

        const data = await res.json() as any;
        return data.choices[0].message as LLMMessage;
    }
}
