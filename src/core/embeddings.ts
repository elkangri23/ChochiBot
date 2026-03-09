import { appConfig } from "../config/index.js";

/**
 * Genera un vector (embedding) para un texto dado utilizando Ollama (preferentemente) u OpenRouter.
 * @param text El texto a convertir en vector.
 * @returns Un array de números que representa el embedding.
 */
export async function getEmbedding(text: string): Promise<number[]> {
    // 1. Intentar con Ollama primero (si está disponible y responde rápido)
    if (appConfig.llm.ollamaBaseUrl && appConfig.llm.ollamaModel) {
        try {
            const baseUrl = appConfig.llm.ollamaBaseUrl.endsWith('/') 
                ? appConfig.llm.ollamaBaseUrl.slice(0, -1) 
                : appConfig.llm.ollamaBaseUrl;
                
            const res = await fetch(`${baseUrl}/api/embeddings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: appConfig.llm.ollamaModel,
                    prompt: text
                })
            });

            if (res.ok) {
                const data = await res.json() as any;
                if (data.embedding) return data.embedding;
            }
        } catch (e) {
            // Silencioso, seguimos con el fallback de OpenRouter si falla la conexión a Ollama
        }
    }

    // 2. Fallback a OpenRouter
    const apiKey = appConfig.llm.openrouterApiKey;
    const model = appConfig.llm.openrouterEmbeddingModel;

    if (!apiKey) {
        throw new Error("No se ha configurado OPENROUTER_API_KEY para embeddings y Ollama no está disponible.");
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                input: text
            })
        });

        const data = await response.json() as any;
        
        if (data.error) {
            throw new Error(`OpenRouter Embedding Error: ${data.error.message}`);
        }

        // OpenRouter devuelve data[0].embedding o similar según el modelo
        return data.data[0].embedding;
    } catch (error: any) {
        console.error("Error obteniendo embedding:", error);
        throw error;
    }
}
