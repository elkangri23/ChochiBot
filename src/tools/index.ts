import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import { appConfig } from "../config/index.js";

const execAsync = util.promisify(exec);

export const toolsRegistry = [
    {
        name: "get_current_time",
        description: "Devuelve la hora y fecha actual del sistema local",
        parameters: { type: "object", properties: {} },
        handler: async () => {
            return { time: new Date().toISOString() };
        }
    },
    {
        name: "shell_secure",
        description: "Ejecuta un comando en la shell del PC local (Windows/PowerShell). ADVERTENCIA: Comandos de alto riesgo requieren confirmación del usuario, pero asume que esta herramienta devuelve una solicitud de confirmación si no es trivial.",
        parameters: {
            type: "object",
            properties: {
                command: { type: "string", description: "Comando a ejecutar" }
            },
            required: ["command"]
        },
        handler: async ({ command, bypassApproval }: { command: string, bypassApproval?: boolean }) => {
            if (!bypassApproval) {
                return { raw_command: command, status: "pending_human_approval", message: "El usuario tiene que aprobar este comando." };
            }

            // Si está aprobado, ejecutamos realmente
            try {
                const { stdout, stderr } = await execAsync(command);
                return { stdout, stderr, status: "success" };
            } catch (error: any) {
                return { error: error.message, status: "error" };
            }
        }
    },
    {
        name: "filesystem",
        description: "Permite leer, escribir o listar archivos en directorios locales. Sólo puede acceder a rutas permitidas.",
        parameters: {
            type: "object",
            properties: {
                action: { type: "string", enum: ["read", "write", "list"], description: "Acción a realizar" },
                filePath: { type: "string", description: "Ruta del archivo o directorio (absoluta y permitida)" },
                content: { type: "string", description: "Contenido para escribir (si action='write')" },
                bypassApproval: { type: "boolean", description: "Uso interno para saltar aprobación tras confirmación real" }
            },
            required: ["action", "filePath"]
        },
        handler: async ({ action, filePath, content, bypassApproval }: { action: string, filePath: string, content?: string, bypassApproval?: boolean }) => {
            // Normalizar ambas rutas (Windows es case-insensitive y usa Mixed Slashes)
            const normalizedPath = path.resolve(filePath).replace(/\\/g, "/").toLowerCase();
            const isAllowed = appConfig.fsPaths.some(p => {
                const normalizedAllowed = path.resolve(p).replace(/\\/g, "/").toLowerCase();
                return normalizedPath.startsWith(normalizedAllowed);
            });

            if (!isAllowed) {
                return {
                    status: "error",
                    message: `Acceso denegado. La ruta ${filePath} no está en la lista de permitidas. Por favor, usa una ruta dentro de: ${appConfig.fsPaths.join(", ")}`
                };
            }

            if (action === "read") {
                const text = fs.readFileSync(filePath, "utf-8");
                return { content: text };
            } else if (action === "list") {
                const files = fs.readdirSync(filePath);
                return { files };
            } else if (action === "write") {
                if (!bypassApproval) {
                    return { action: "write", filePath, status: "pending_human_approval", message: "User must manually approve this write." };
                }

                fs.writeFileSync(filePath, content || "", "utf-8");
                return { status: "success", message: `Archivo escrito en ${filePath}` };
            }
            throw new Error(`Invalid filesystem action: ${action}`);
        }
    },
    {
        name: "http_client",
        description: "Envía una petición HTTP",
        parameters: {
            type: "object",
            properties: {
                url: { type: "string", description: "URL a llamar" },
                method: { type: "string", enum: ["GET", "POST"], description: "Método HTTP" },
                body: { type: "string", description: "Body de la petición si es POST (JSON string)" }
            },
            required: ["url"]
        },
        handler: async ({ url, method = "GET", body }: { url: string, method?: string, body?: string }) => {
            const res = await fetch(url, { method, body: body || undefined, headers: body ? { "Content-Type": "application/json" } : undefined });
            const text = await res.text();
            return { status: res.status, response: text.substring(0, 1000) };
        }
    },
    {
        name: "pc_integration",
        description: "Abre VSCode en una ruta concreta en el PC",
        parameters: {
            type: "object",
            properties: {
                action: { type: "string", enum: ["open_vscode"], description: "Acción a ejecutar en el PC" },
                targetPath: { type: "string", description: "Ruta a abrir en VSCode" }
            },
            required: ["action", "targetPath"]
        },
        handler: async ({ action, targetPath }: { action: string, targetPath: string }) => {
            if (action === "open_vscode") {
                const isAllowed = appConfig.fsPaths.some(p => targetPath.startsWith(p));
                if (!isAllowed) throw new Error("Ruta no permitida.");
                await execAsync(`"${appConfig.vscodePath}" "${targetPath}"`);
                return { status: "success", message: `VSCode opened at ${targetPath}` };
            }
            throw new Error("Invalid pc_integration action");
        }
    }
];

export function getToolsDefinitions() {
    return toolsRegistry.map((t) => ({
        type: "function" as const,
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
        }
    }));
}
