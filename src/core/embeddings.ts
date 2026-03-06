import { appConfig } from "../config/index.js";

/**
 * Genera un vector (embedding) para un texto dado utilizando OpenRouter.
 * @param text El texto a convertir en vector.
 * @returns Un array de números que representa el embedding.
 */
export async function getEmbedding(text: string): Promise<number[]> {
    const apiKey = appConfig.llm.openrouterApiKey;
    const model = appConfig.llm.openrouterEmbeddingModel;

    if (!apiKey) {
        throw new Error("No se ha configurado OPENROUTER_API_KEY para embeddings.");
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
