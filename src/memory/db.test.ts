import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs";

// Mock config BEFORE importing db
vi.mock("../config/index.js", () => ({
    appConfig: {
        dbPath: ":memory:" // SQLite in-memory for testing
    }
}));

import { 
    initDb, 
    getOrCreateUser, 
    addMemory, 
    getMemories, 
    addVpsProfile, 
    getVpsProfiles, 
    deleteVpsProfile,
    addSemanticMemory,
    searchSemanticMemories
} from "./db.js";

describe("Database Memory Module", () => {
    beforeEach(() => {
        initDb();
    });

    it("should create and retrieve users", () => {
        const user = getOrCreateUser(12345, "TestUser");
        expect(user.telegram_id).toBe(12345);
        expect(user.name).toBe("TestUser");

        const existing = getOrCreateUser(12345);
        expect(existing.id).toBe(user.id);
    });

    it("should add and retrieve standard memories", () => {
        const user = getOrCreateUser(111);
        addMemory(user.id, "fact", "Likes coffee");
        
        const memories = getMemories(user.id);
        expect(memories.length).toBe(1);
        expect(memories[0].content).toBe("Likes coffee");
    });

    it("should manage VPS profiles", () => {
        addVpsProfile("prod-server", "1.2.3.4", "admin", 2222, "/keys/id_rsa");
        const profiles = getVpsProfiles();
        
        expect(profiles.length).toBe(1);
        expect(profiles[0].name).toBe("prod-server");
        expect(profiles[0].port).toBe(2222);

        deleteVpsProfile(profiles[0].id);
        expect(getVpsProfiles().length).toBe(0);
    });

    it("should store and search semantic memories", () => {
        const embedding = [0.1, 0.2, 0.3];
        addSemanticMemory("Python is great", embedding, { lang: "py" });
        
        const results = searchSemanticMemories([0.1, 0.2, 0.31], 1);
        expect(results.length).toBe(1);
        expect(results[0].content).toBe("Python is great");
        expect(results[0].similarity).toBeGreaterThan(0.99);
    });
});
