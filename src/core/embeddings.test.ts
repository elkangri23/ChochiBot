import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock configuration
vi.mock("../config/index.js", () => ({
    appConfig: {
        llm: {
            openrouterApiKey: "test-key",
            openrouterEmbeddingModel: "test-model"
        }
    }
}));

import { getEmbedding } from "./embeddings.js";

describe("Embeddings Module", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("should return an embedding vector on success", async () => {
        const fakeEmbedding = [0.1, 0.2, 0.3];
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                data: [{ embedding: fakeEmbedding }]
            })
        });

        const result = await getEmbedding("hello world");
        expect(result).toEqual(fakeEmbedding);
        expect(mockFetch).toHaveBeenCalledWith(
            "https://openrouter.ai/api/v1/embeddings",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    "Authorization": "Bearer test-key"
                })
            })
        );
    });

    it("should throw an error if API returns error", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({
                error: { message: "Invalid API Key" }
            })
        });

        await expect(getEmbedding("fail")).rejects.toThrow("OpenRouter Embedding Error: Invalid API Key");
    });
});
