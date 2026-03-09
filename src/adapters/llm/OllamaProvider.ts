import { LLMMessage, LLMProvider, ToolDefinition } from "./LLMProvider.js";

export class OllamaProvider implements LLMProvider {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string, model: string) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        this.model = model;
    }

    async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMMessage> {
        // Clonar mensajes para no mutar el array original del agente
        const formattedMessages = messages.map(msg => {
            const newMsg = { ...msg };
            if (newMsg.tool_calls) {
                newMsg.tool_calls = newMsg.tool_calls.map(tc => {
                    const newTc = { ...tc, function: { ...tc.function } };
                    if (newTc.function && typeof newTc.function.arguments === "string") {
                        try {
                            (newTc.function as any).arguments = JSON.parse(newTc.function.arguments);
                        } catch (e) {
                            (newTc.function as any).arguments = {};
                        }
                    }
                    return newTc;
                });
            }
            return newMsg;
        });
        
        console.log("SENDING TO OLLAMA:", JSON.stringify(formattedMessages, null, 2));

        const payload: any = {
            model: this.model,
            messages: formattedMessages,
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
        const message = data.message as LLMMessage;
        
        // Mapear el comportamiento variante de herramientas en Ollama
        
        // 1. A veces el modelo Qwen (u otros de Ollama) escupe la tool como JSON en el 'content'
        if (!message.tool_calls || message.tool_calls.length === 0) {
            if (message.content) {
                try {
                    // Limpiamos un poco por si pone algo antes o después del JSON
                    const match = message.content.match(/(\{[\s\S]*\})/);
                    if (match) {
                        const parsed = JSON.parse(match[1]);
                        // Si luce como un llamado de función (tiene name)
                        if (parsed && typeof parsed === "object" && typeof parsed.name === "string") {
                            message.tool_calls = [{
                                id: "call_ollama_" + Math.random().toString(36).substring(7),
                                type: "function",
                                function: {
                                    name: parsed.name,
                                    arguments: typeof parsed.arguments === "object" 
                                        ? JSON.stringify(parsed.arguments || {}) 
                                        : (typeof parsed.arguments === "string" ? parsed.arguments : "{}")
                                }
                            }];
                            message.content = ""; // Removemos el string original para que el agente procese el tool_call
                        }
                    }
                } catch (e) {
                    // Ignoramos, es solo texto regular que resultó tener llaves malformadas
                }
            }
        }

        // 2. Ollama devuelve 'arguments' como Objeto internamente, pero OpenAI lo espera como un String de JSON
        if (message.tool_calls) {
            for (const call of message.tool_calls) {
                if (call.function && typeof call.function.arguments === "object") {
                    call.function.arguments = JSON.stringify(call.function.arguments);
                }
            }
        }

        return message;
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
