import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import { appConfig } from "../config/index.js";
import { db, addMemory, getMemories, getOrCreateUser, addVpsProfile, getVpsProfiles, deleteVpsProfile, addSemanticMemory, searchSemanticMemories } from "../memory/db.js";
import { getEmbedding } from "../core/embeddings.js";
import { NodeSSH } from "node-ssh";

const execAsync = util.promisify(exec);

const staticTools: any[] = [
    {
        name: "create_skill",
        description: "Crea una nueva herramienta (skill) para el bot escribiendo código TypeScript. El código debe ser un handler que acepte parámetros y devuelva un objeto. Úsalo para ampliar tus propias capacidades.",
        parameters: {
            type: "object",
            properties: {
                skillName: { type: "string", description: "Nombre de la nueva herramienta (ej: 'github_search')" },
                description: { type: "string", description: "Descripción clara de lo que hace la herramienta" },
                parameters: { type: "object", description: "Esquema JSON de los parámetros de la herramienta" },
                code: { type: "string", description: "Código TypeScript del handler. Debe seguir el formato (args) => { ... }" },
                bypassApproval: { type: "boolean" }
            },
            required: ["skillName", "description", "parameters", "code"]
        },
        handler: async ({ skillName, description, parameters, code, bypassApproval }: any) => {
            if (!bypassApproval) {
                return { 
                    status: "pending_human_approval", 
                    message: `¿Quieres que Chochi aprenda la nueva skill '${skillName}'?`, 
                    toolName: "create_skill", 
                    toolArgs: { skillName, description, parameters, code } 
                };
            }

            const skillsDir = path.resolve(process.cwd(), "src/skills");
            if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true });

            const filePath = path.join(skillsDir, `${skillName}.ts`);
            const fileContent = `
/**
 * Skill auto-generada por ChochiBot
 * Nombre: ${skillName}
 * Descripción: ${description}
 */

export const definition = {
    name: "${skillName}",
    description: "${description}",
    parameters: ${JSON.stringify(parameters, null, 2)}
};

export const handler = async (args: any) => {
    try {
        const fn = ${code};
        return await fn(args);
    } catch (e: any) {
        return { status: "error", message: e.message };
    }
};
`;
            fs.writeFileSync(filePath, fileContent, "utf-8");
            
            // Re-inicializamos para cargar la nueva skill inmediatamente
            await loadExternalSkills();

            return { status: "success", message: `Skill '${skillName}' creada y cargada correctamente. ¡Ahora puedo usarla!` };
        }
    },
    {
        name: "manage_memory",
        description: "Añade, lista o elimina hechos y preferencias del usuario en la memoria persistente.",
        parameters: {
            type: "object",
            properties: {
                action: { type: "string", enum: ["add", "list", "delete"], description: "Acción a realizar" },
                content: { type: "string", description: "El hecho o preferencia a recordar" },
                type: { type: "string", description: "Categoría (ej: 'preference', 'fact')" },
                memoryId: { type: "number", description: "ID para eliminar" }
            },
            required: ["action"]
        },
        handler: async ({ action, content, type = "fact", memoryId, userId }: any) => {
            if (action === "add") {
                if (!content) throw new Error("Se requiere contenido");
                addMemory(userId, type, content);
                return { status: "success", message: `Memoria guardada: "${content}"` };
            } else if (action === "list") {
                return { status: "success", memories: getMemories(userId) };
            } else if (action === "delete") {
                if (!memoryId) throw new Error("Se requiere memoryId");
                db.prepare("DELETE FROM memories WHERE id = ? AND user_id = ?").run(memoryId, userId);
                return { status: "success", message: `Memoria ${memoryId} eliminada` };
            }
            throw new Error("Acción no válida");
        }
    },
    {
        name: "get_current_time",
        description: "Devuelve la fecha y hora actual",
        parameters: { type: "object", properties: {} },
        handler: async () => ({ time: new Date().toISOString() })
    },
    {
        name: "shell_secure",
        description: "Ejecuta un comando en la shell del PC local.",
        parameters: {
            type: "object",
            properties: { command: { type: "string" } },
            required: ["command"]
        },
        handler: async ({ command, bypassApproval }: any) => {
            if (!bypassApproval) {
                return { status: "pending_human_approval", message: "Aprobación de comando requerida.", toolName: "shell_secure", toolArgs: { command } };
            }
            try {
                const { stdout, stderr } = await execAsync(command);
                return { stdout, stderr, status: "success" };
            } catch (e: any) {
                return { error: e.message, status: "error" };
            }
        }
    },
    {
        name: "filesystem",
        description: "Lee, escribe o lista archivos locales.",
        parameters: {
            type: "object",
            properties: {
                action: { type: "string", enum: ["read", "write", "list"] },
                filePath: { type: "string" },
                content: { type: "string" }
            },
            required: ["action", "filePath"]
        },
        handler: async ({ action, filePath, content, bypassApproval }: any) => {
            const normalizedPath = path.resolve(filePath).replace(/\\/g, "/").toLowerCase();
            const isAllowed = appConfig.fsPaths.some(p => normalizedPath.startsWith(path.resolve(p).replace(/\\/g, "/").toLowerCase()));

            if (!isAllowed) return { status: "error", message: "Ruta no permitida." };

            if (action === "read") return { content: fs.readFileSync(filePath, "utf-8") };
            if (action === "list") return { files: fs.readdirSync(filePath) };
            if (action === "write") {
                if (!bypassApproval) return { status: "pending_human_approval", toolName: "filesystem", toolArgs: { action, filePath, content } };
                fs.writeFileSync(filePath, content || "", "utf-8");
                return { status: "success" };
            }
            throw new Error("Acción inválida");
        }
    },
    {
        name: "http_client",
        description: "Petición HTTP",
        parameters: {
            type: "object",
            properties: { url: { type: "string" }, method: { type: "string" }, body: { type: "string" } },
            required: ["url"]
        },
        handler: async ({ url, method = "GET", body }: any) => {
            const res = await fetch(url, { method, body: body || undefined });
            return { status: res.status, response: (await res.text()).substring(0, 500) };
        }
    },
    {
        name: "pc_integration",
        description: "Control de PC (VSCode)",
        parameters: {
            type: "object",
            properties: { action: { type: "string" }, targetPath: { type: "string" } },
            required: ["action", "targetPath"]
        },
        handler: async ({ action, targetPath }: any) => {
            if (action === "open_vscode") {
                await execAsync(`"${appConfig.vscodePath}" "${targetPath}"`);
                return { status: "success" };
            }
            throw new Error("Acción inválida");
        }
    },
    {
        name: "notion_manager",
        description: "Interactúa con Notion para crear páginas, registrar logs o consultar bases de datos.",
        parameters: {
            type: "object",
            properties: {
                action: { type: "string", enum: ["create_page", "query_database", "list_databases"], description: "Acción a realizar en Notion" },
                databaseId: { type: "string", description: "El ID de la base de datos (opcional, usa el de defecto si no se provee)" },
                title: { type: "string", description: "Título para la nueva página" },
                content: { type: "string", description: "Contenido adicional o descripción" }
            },
            required: ["action"]
        },
        handler: async ({ action, databaseId, title, content }: any) => {
            const token = appConfig.notion.apiKey;
            if (!token) throw new Error("Notion API Key no configurada en .env");
            
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28"
            };

            if (action === "create_page") {
                const dbId = databaseId || appConfig.notion.defaultDatabaseId;
                if (!dbId) throw new Error("Database ID no proporcionado y no hay uno por defecto");

                const body = {
                    parent: { database_id: dbId },
                    properties: {
                        Name: { // Nota: Depende del esquema de la tabla de Notion, 'Name' es el default frecuente
                            title: [{ text: { content: title || "Log de ChochiBot" } }]
                        }
                    },
                    children: content ? [
                        {
                            object: 'block',
                            type: 'paragraph',
                            paragraph: {
                                rich_text: [{ type: 'text', text: { content } }]
                            }
                        }
                    ] : []
                };

                const res = await fetch("https://api.notion.com/v1/pages", {
                    method: "POST",
                    headers,
                    body: JSON.stringify(body)
                });
                const data = await res.json() as any;
                if (data.object === "error") throw new Error(data.message);
                return { status: "success", url: data.url };
            }

            if (action === "query_database") {
                const dbId = databaseId || appConfig.notion.defaultDatabaseId;
                const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
                    method: "POST",
                    headers
                });
                const data = await res.json() as any;
                return { results: data.results?.length || 0, first: data.results?.[0]?.properties };
            }
            
            throw new Error("Acción de Notion no soportada");
        }
    },
    {
        name: "ssh_manager",
        description: "Gestiona perfiles de servidores VPS y ejecuta comandos vía SSH.",
        parameters: {
            type: "object",
            properties: {
                action: { type: "string", enum: ["add_profile", "list_profiles", "delete_profile", "exec"], description: "Acción SSH" },
                profileName: { type: "string", description: "Nombre del perfil guardado" },
                host: { type: "string", description: "IP o dominio del servidor" },
                user: { type: "string", description: "Usuario SSH" },
                command: { type: "string", description: "Comando a ejecutar remotamente" },
                port: { type: "number", description: "Puerto SSH (default 22)" }
            },
            required: ["action"]
        },
        handler: async ({ action, profileName, host, user, command, port = 22, bypassApproval }: any) => {
            if (action === "add_profile") {
                if (!profileName || !host || !user) throw new Error("Faltan datos para crear el perfil");
                addVpsProfile(profileName, host, user, port);
                return { status: "success", message: `Perfil '${profileName}' guardado correctamente.` };
            }

            if (action === "list_profiles") {
                const profiles = getVpsProfiles();
                if (appConfig.vps.ip && appConfig.vps.user) {
                    profiles.unshift({
                        id: 0,
                        name: "MainVPS (from .env)",
                        host: appConfig.vps.ip,
                        user: appConfig.vps.user,
                        port: appConfig.vps.port,
                        ssh_key_path: "ENV_CONFIG"
                    } as any);
                }
                return { status: "success", profiles };
            }

            if (action === "delete_profile") {
                // Implementación simple por nombre o ID si se mejora la lógica
                return { status: "info", message: "Usa la base de datos para borrar por ahora." };
            }

            if (action === "exec") {
                if (!command) throw new Error("Se requiere un comando");
                
                let targetHost = host;
                let targetUser = user;
                let targetPort = port;

                if (profileName) {
                    if (profileName === "MainVPS (from .env)" || profileName === "MainVPS") {
                        targetHost = appConfig.vps.ip;
                        targetUser = appConfig.vps.user;
                        targetPort = appConfig.vps.port;
                    } else {
                        const profiles = getVpsProfiles();
                        const p = profiles.find(x => x.name === profileName);
                        if (p) {
                            targetHost = p.host;
                            targetUser = p.user;
                            targetPort = p.port;
                        }
                    }
                }

                if (!targetHost || !targetUser) throw new Error("No se ha especificado servidor");


                if (!targetHost || !targetUser) throw new Error("No se ha especificado servidor");

                if (!bypassApproval) {
                    return { 
                        status: "pending_human_approval", 
                        message: `¿Ejecutar '${command}' en ${targetUser}@${targetHost}:${targetPort}?`, 
                        toolName: "ssh_manager", 
                        toolArgs: { action: "exec", host: targetHost, user: targetUser, command, port: targetPort, profileName } 
                    };
                }

                try {
                    const ssh = new NodeSSH();
                    const sshConfig: any = {
                        host: targetHost,
                        username: targetUser,
                        port: targetPort
                    };
                    const defaultKeyPath = 'C:\\Users\\amoles\\.ssh\\id_rsa';
                    if (fs.existsSync(defaultKeyPath)) {
                        sshConfig.privateKey = fs.readFileSync(defaultKeyPath, 'utf8');
                    }

                    // Si coincide con el host/user del .env y no tenemos password aún (ni llave), usar la del .env
                    if (!sshConfig.password && !sshConfig.privateKey) {
                        const isMainVps = targetHost === appConfig.vps.ip && targetUser === appConfig.vps.user;
                        if (isMainVps && appConfig.vps.password) {
                            sshConfig.password = appConfig.vps.password;
                        }
                    }

                    await ssh.connect(sshConfig);
                    const result = await ssh.execCommand(command);
                    ssh.dispose();

                    return { 
                        status: "success", 
                        stdout: result.stdout, 
                        stderr: result.stderr,
                        code: result.code
                    };
                } catch (e: any) {
                    return { status: "error", message: `Error SSH (node-ssh): ${e.message}` };
                }
            }
        }
    },
    {
        name: "github_advanced",
        description: "Gestión avanzada de GitHub: crear repos, listar issues, gestionar PRs.",
        parameters: {
            type: "object",
            properties: {
                action: { type: "string", enum: ["list_repos", "create_repo", "list_issues", "create_pr"], description: "Acción de GitHub" },
                repoName: { type: "string", description: "Nombre del repositorio" },
                title: { type: "string", description: "Título para PR o Issue" },
                head: { type: "string", description: "Rama origen (para PR)" },
                base: { type: "string", description: "Rama destino (para PR, default 'main')" }
            },
            required: ["action"]
        },
        handler: async ({ action, repoName, title, head, base = "main" }: any) => {
            const token = appConfig.githubToken;
            if (!token) throw new Error("GITHUB_TOKEN no configurado en .env");

            const headers = {
                "Authorization": `token ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            };

            if (action === "list_repos") {
                const res = await fetch("https://api.github.com/user/repos?sort=updated", { headers });
                const repos = await res.json() as any[];
                return { status: "success", repos: repos.slice(0, 10).map(r => ({ name: r.full_name, url: r.html_url })) };
            }

            if (action === "create_repo") {
                if (!repoName) throw new Error("Se requiere nombre del repo");
                const res = await fetch("https://api.github.com/user/repos", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ name: repoName, private: true })
                });
                const repo = await res.json() as any;
                if (repo.errors) throw new Error(repo.message);
                return { status: "success", url: repo.html_url };
            }

            if (action === "create_pr") {
                if (!repoName || !title || !head) throw new Error("Faltan datos para la PR");
                const res = await fetch(`https://api.github.com/repos/${repoName}/pulls`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ title, head, base })
                });
                const pr = await res.json() as any;
                if (pr.errors) throw new Error(pr.message);
                return { status: "success", url: pr.html_url };
            }

            throw new Error("Acción de GitHub no soportada");
        }
    },
    {
        name: "ingest_knowledge",
        description: "Guarda información en la memoria semántica (RAG) para recordarla en el futuro basándose en su significado.",
        parameters: {
            type: "object",
            properties: {
                content: { type: "string", description: "El conocimiento o texto a recordar." },
                category: { type: "string", description: "Categoría opcional (ej: 'docs', 'experience')." }
            },
            required: ["content"]
        },
        handler: async ({ content, category = "general" }: any) => {
            try {
                const embedding = await getEmbedding(content);
                addSemanticMemory(content, embedding, { category, source: "ingest_tool" });
                return { status: "success", message: "Conocimiento ingerido correctamente en la memoria semántica." };
            } catch (e: any) {
                return { status: "error", message: `Error al ingerir conocimiento: ${e.message}` };
            }
        }
    }
];

export let toolsRegistry: any[] = [...staticTools];

export async function loadExternalSkills() {
    const skillsDir = path.resolve(process.cwd(), "src/skills");
    if (!fs.existsSync(skillsDir)) return;

    const files = fs.readdirSync(skillsDir).filter(f => f.endsWith(".ts"));
    toolsRegistry = [...staticTools];

    for (const file of files) {
        try {
            const skillPath = path.join(skillsDir, file);
            const skillUrl = `file://${skillPath.replace(/\\/g, "/")}`;
            const skill = await import(`${skillUrl}?t=${Date.now()}`);
            if (skill.definition && skill.handler) {
                toolsRegistry.push({ ...skill.definition, handler: skill.handler });
            }
        } catch (e) {
            console.error(`Error loading skill ${file}:`, e);
        }
    }
}

export function getToolsDefinitions() {
    return toolsRegistry.map(t => ({
        type: "function" as const,
        function: { name: t.name, description: t.description, parameters: t.parameters }
    }));
}
