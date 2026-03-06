import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { appConfig } from "../config/index.js";

const dbDir = path.dirname(appConfig.dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(appConfig.dbPath);
db.pragma('journal_mode = WAL');

export function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE,
            name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            type TEXT, -- 'preference', 'fact', 'project', etc.
            content TEXT, -- JSON
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            path TEXT,
            repo_url TEXT,
            type TEXT,
            metadata TEXT -- JSON
        );

        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            status TEXT, -- 'draft', 'pending_review', 'approved', 'disabled'
            config TEXT, -- JSON
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tool_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            tool_name TEXT,
            user_id INTEGER,
            input TEXT, -- JSON
            output TEXT, -- JSON
            status TEXT -- 'success', 'error'
        );

        CREATE TABLE IF NOT EXISTS vps_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            host TEXT,
            user TEXT,
            port INTEGER DEFAULT 22,
            key_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS semantic_memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT,
            embedding TEXT, -- JSON array
            metadata TEXT,  -- JSON
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}
export function getOrCreateUser(telegramId: number, name?: string) {
    const existing = db.prepare("SELECT * FROM users WHERE telegram_id = ?").get(telegramId) as any;
    if (existing) return existing;

    const info = db.prepare("INSERT INTO users (telegram_id, name) VALUES (?, ?)").run(telegramId, name || null);
    return { id: info.lastInsertRowid, telegram_id: telegramId, name };
}

export function addMemory(userId: number, type: string, content: string) {
    return db.prepare("INSERT INTO memories (user_id, type, content) VALUES (?, ?, ?)").run(userId, type, content);
}

export function getMemories(userId: number) {
    return db.prepare("SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC").all(userId) as any[];
}

export function addVpsProfile(name: string, host: string, user: string, port: number = 22, keyPath?: string) {
    return db.prepare("INSERT INTO vps_profiles (name, host, user, port, key_path) VALUES (?, ?, ?, ?, ?)").run(name, host, user, port, keyPath || null);
}

export function getVpsProfiles() {
    return db.prepare("SELECT * FROM vps_profiles ORDER BY name ASC").all() as any[];
}

export function deleteVpsProfile(id: number) {
    return db.prepare("DELETE FROM vps_profiles WHERE id = ?").run(id);
}

// --- MEMORIA SEMÁNTICA (RAG) ---

export function addSemanticMemory(content: string, embedding: number[], metadata: any = {}) {
    return db.prepare("INSERT INTO semantic_memories (content, embedding, metadata) VALUES (?, ?, ?)")
        .run(content, JSON.stringify(embedding), JSON.stringify(metadata));
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function searchSemanticMemories(queryEmbedding: number[], limit: number = 3) {
    const all = db.prepare("SELECT * FROM semantic_memories").all() as any[];
    
    const scores = all.map(row => ({
        ...row,
        similarity: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding))
    }));

    return scores
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
}
