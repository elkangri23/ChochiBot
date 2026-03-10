/**
 * Skill auto-generada por ChochiBot  
 * Nombre: gmail_assistant
 * Descripción: Asistente de Gmail simplificado para búsquedas, envíos y gestión de correos
 */

import { exec } from "child_process";
import util from "util";
import { GmailActionParams, SkillResponse, validateEmail } from "./types.js";

const execAsync = util.promisify(exec);

export const definition = {
    name: "gmail_assistant", 
    description: "Asistente Gmail simplificado. Busca emails, envía correos, gestiona bandeja. Ideal para uso diario.",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: ["search", "send", "send_reply", "recent", "unread", "from_sender"],
                description: "Qué hacer con Gmail"
            },
            query: { type: "string", description: "Términos de búsqueda o query Gmail" },
            to: { type: "string", description: "Email del destinatario" },
            subject: { type: "string", description: "Asunto del email" },
            message: { type: "string", description: "Contenido del mensaje" },
            sender: { type: "string", description: "Filtrar por remitente específico" },
            days: { type: "number", description: "Días hacia atrás para buscar", default: 7 },
            limit: { type: "number", description: "Máximo resultados", default: 10 },
            replyToMessageId: { type: "string", description: "ID del mensaje al que responder" },
            account: { type: "string", description: "Cuenta Gmail específica (opcional)" },
            bypassApproval: { type: "boolean", description: "Omitir aprobación" }
        },
        required: ["action"]
    }
};

// Validation functions - strict input validation per deployment-standards
function validateGmailParams(params: GmailActionParams): string | null {
    const { action, to, subject, message, sender, days, limit, replyToMessageId } = params;
    
    if (action === "send" || action === "send_reply") {
        if (!to || !validateEmail(to)) {
            return "Email destinatario requerido y debe ser válido";
        }
        if (!subject || subject.trim().length === 0) {
            return "Asunto requerido";
        }
        if (!message || message.trim().length === 0) {
            return "Mensaje requerido";
        }
        if (action === "send_reply" && !replyToMessageId) {
            return "ID del mensaje para responder es requerido";
        }
    }
    
    if (action === "search" && (!params.query || params.query.trim().length === 0)) {
        return "Query de búsqueda requerido";
    }
    
    if (action === "from_sender" && (!sender || !validateEmail(sender))) {
        return "Sender requerido y debe ser email válido";
    }
    
    if (days !== undefined && (days < 1 || days > 365)) {
        return "Días debe estar entre 1 y 365";
    }
    
    if (limit !== undefined && (limit < 1 || limit > 100)) {
        return "Límite debe estar entre 1 y 100";
    }
    
    return null;
}

// Find gog path - helper function
async function findGogPath(): Promise<string | null> {
    const gogPaths = [
        "gog", // Global PATH
        `${process.env.LOCALAPPDATA}\\Microsoft\\WinGet\\Packages\\steipete.gogcli_Microsoft.Winget.Source_8wekyb3d8bbwe\\gog.exe`, // Windows winget
        "/usr/local/bin/gog", // macOS brew
        "/opt/homebrew/bin/gog" // macOS M1 brew
    ];

    for (const gogPath of gogPaths) {
        try {
            await execAsync(`"${gogPath}" --version`, { timeout: 5000 });
            return gogPath;
        } catch {
            continue;
        }
    }
    
    return null;
}

// Check gog installation - separate function per SRP
async function checkGogInstallation(): Promise<SkillResponse | null> {
    try {
        const gogPaths = [
            "gog", // Global PATH
            `${process.env.LOCALAPPDATA}\\Microsoft\\WinGet\\Packages\\steipete.gogcli_Microsoft.Winget.Source_8wekyb3d8bbwe\\gog.exe`, // Windows winget
            "/usr/local/bin/gog", // macOS brew
            "/opt/homebrew/bin/gog" // macOS M1 brew
        ];

        let gogFound = false;
        
        for (const gogPath of gogPaths) {
            try {
                await execAsync(`"${gogPath}" --version`, { timeout: 5000 });
                // Verificar que hay cuentas configuradas
                await execAsync(`"${gogPath}" auth list`, { timeout: 5000 });
                gogFound = true;
                break;
            } catch {
                continue;
            }
        }
        
        if (!gogFound) {
            return {
                status: "error",
                message: "❌ Necesitas instalar 'gog' CLI primero:\nwinget install steipete.gogcli\n\nY configurar OAuth:\n{ action: 'auth_login', email: 'tu@gmail.com' }"
            };
        }
        
        return null; // No error
    } catch {
        return {
            status: "error",
            message: "❌ Error verificando gog CLI"
        };
    }
}

// Build Gmail command - separate function per SRP  
function buildGmailCommand(params: GmailActionParams): string {
    const { action, query, days = 7, limit = 10, sender, to, subject, message, replyToMessageId, account } = params;
    let command = "gog gmail";

    switch (action) {
        case "search":
            command += ` search '${query}' --max ${limit}`;
            break;
        case "recent":
            command += ` search 'newer_than:${days}d' --max ${limit}`;
            break;
        case "unread":
            command += ` search 'is:unread newer_than:${days}d' --max ${limit}`;
            break;
        case "from_sender":
            command += ` search 'from:${sender} newer_than:${days}d' --max ${limit}`;
            break;
        case "send":
            command += ` send --to ${to} --subject "${subject}" --body "${message}"`;
            break;
        case "send_reply":
            command += ` send --to ${to} --subject "${subject}" --body "${message}" --reply-to-message-id ${replyToMessageId}`;
            break;
    }

    if (account) {
        command += ` --account ${account}`;
    }

    return command;
}

// Check if action requires approval - separate function
function requiresApproval(action: string): boolean {
    return action === "send" || action === "send_reply";
}

// Format search results - separate function
function formatSearchResults(stdout: string, action: string): SkillResponse {
    const lines = stdout.trim().split('\n').filter(l => l.trim().length > 0);
    
    // Skip the header (ID DATE FROM SUBJECT...)
    const startIndex = lines.findIndex(l => l.includes("ID") && l.includes("DATE") && l.includes("FROM"));
    const dataLines = startIndex !== -1 ? lines.slice(startIndex + 1) : lines;
    
    const emails: any[] = [];
    
    // Simple line-based parsing for gog output
    // Each email usually starts with an ID (hex string)
    for (const line of dataLines) {
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length >= 4 && /^[0-9a-f]{16}$/.test(parts[0])) {
            emails.push({
                id: parts[0],
                date: parts[1],
                from: parts[2].split('<')[0].trim() || parts[2],
                subject: parts[3]
            });
        }
    }

    if (emails.length === 0) {
        return {
            status: "success",
            output: stdout,
            emails_found: 0,
            formatted_output: "📧 He echado un ojo, jefe, pero no hay nada que coincida con lo que buscas. ¡Bandeja impecable! 🧼"
        };
    }

    const formattedList = emails.map(e => `• **${e.from}**: ${e.subject} _(${e.date.split(' ')[0]})_`).join('\n');
    const intro = emails.length === 1 
        ? "📧 ¡Mira! He encontrado este correo:" 
        : `📧 ¡Oído cocina! Aquí tienes los ${emails.length} correos que he encontrado:`;

    return {
        status: "success",
        output: stdout,
        emails_found: emails.length,
        emails: emails, // Pass structured data too
        formatted_output: `${intro}\n\n${formattedList}`
    };
}



export const handler = async (args: GmailActionParams): Promise<SkillResponse> => {
    try {
        // Strict validation per deployment-standards
        const validationError = validateGmailParams(args);
        if (validationError) {
            return { status: "error", message: validationError };
        }

        // Check gog installation and get path
        const installError = await checkGogInstallation();
        if (installError) return installError;
        
        const gogPath = await findGogPath();
        if (!gogPath) {
            return { status: "error", message: "❌ No se pudo encontrar gog CLI" };
        }

        let command = buildGmailCommand(args);
        
        // Replace "gog" with full path
        command = command.replace(/^gog /, `"${gogPath}" `);

        // Approval check for sensitive operations
        if (requiresApproval(args.action) && !args.bypassApproval) {
            return {
                status: "pending_human_approval",
                message: `📧 Enviar email desde Gmail:\nPara: ${args.to}\nAsunto: ${args.subject}\nMensaje: ${args.message}\n\n¿Confirmar envío?`,
                toolName: "gmail_assistant",
                toolArgs: { ...args, bypassApproval: true }
            };
        }

        // Execute command
        const { stdout, stderr } = await execAsync(command, { 
            timeout: 30000,
            encoding: 'utf8'
        });

        // Format results based on action type
        if (args.action.includes("search") || args.action === "recent" || args.action === "unread" || args.action === "from_sender") {
            const result = formatSearchResults(stdout, args.action);
            if (stderr) result.warnings = stderr;
            return result;
        }

        // Default success response
        const result: SkillResponse = {
            status: "success",
            command,
            output: stdout
        };
        
        if (stderr) result.warnings = stderr;
        return result;

    } catch (e: unknown) {
        const error = e as Error;
        return { 
            status: "error", 
            message: `Error en Gmail: ${error.message}` 
        };
    }
};