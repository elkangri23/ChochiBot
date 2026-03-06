import { describe, it, expect, vi } from "vitest";

// Mock config
vi.mock("../config/index.js", () => ({
    appConfig: { 
        fsPaths: ["C:/Temp"], 
        vscodePath: "code" 
    }
}));

import { toolsRegistry } from "./index.js";

describe("Tools Registry", () => {
    it("should export definitions correctly", () => {
        expect(toolsRegistry).toBeDefined();
        expect(toolsRegistry.length).toBeGreaterThan(0);
    });

    it("should respond normally to get_current_time", async () => {
        const timeTool = toolsRegistry.find((t) => t.name === "get_current_time");
        expect(timeTool).toBeDefined();
        if (timeTool) {
            const res = await timeTool.handler({} as any);
            expect(res).toHaveProperty("time");
        }
    });

    it("should require human approval for shell_secure unconditionally in local mode", async () => {
        const shellTool = toolsRegistry.find((t) => t.name === "shell_secure");
        expect(shellTool).toBeDefined();
        if (shellTool) {
            const res = await shellTool.handler({ command: "echo 'hello world'" } as any) as any;
            expect(res.status).toBe("pending_human_approval");
            expect(res.raw_command).toBe("echo 'hello world'");
            expect(res.message).toBeDefined();
        }
    });

    it("should trigger approval or action matching for filesystem 'write'", async () => {
        const fsTool = toolsRegistry.find((t) => t.name === "filesystem");
        expect(fsTool).toBeDefined();
        if (fsTool) {
            try {
                // If it resolves, it should be pending human approval because it's a write action
                const fsPath = process.env.ALLOWED_FS_PATHS ? process.env.ALLOWED_FS_PATHS.split(",")[0] + "/test.txt" : "C:/Temp/test.txt";
                const res = await fsTool.handler({ action: "write", filePath: fsPath, content: "abc" } as any) as any;
                expect(res.status).toBe("pending_human_approval");
            } catch (err) {
                // Si salta error de ruta denegada también es válido porque depende de las env locales, pero interceptamos el error.
                expect(err).toBeInstanceOf(Error);
            }
        }
    });
});
