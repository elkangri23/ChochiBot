import { db } from "../../memory/db.js";

export function logToolUsage(toolName: string, userId: number | null, input: string, output: string, status: "success" | "error") {
    db.prepare(`
        INSERT INTO tool_logs (tool_name, user_id, input, output, status) 
        VALUES (?, ?, ?, ?, ?)
    `).run(toolName, userId, input, output, status);
}
