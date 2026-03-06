import { describe, it, expect, vi } from "vitest";

// Mock the database
const mockAddLog = vi.fn();
vi.mock("../../memory/db.js", () => ({
    db: {
        prepare: () => ({
            run: mockAddLog
        })
    }
}));

import { logToolUsage } from "./index.js";

describe("Logger Module", () => {
    it("should call the database to save tool execution logs", async () => {
        logToolUsage("testTool", 1, "{}", "OK", "success");
        
        expect(mockAddLog).toHaveBeenCalledWith(
            "testTool",
            1,
            "{}",
            "OK",
            "success"
        );
    });
});
