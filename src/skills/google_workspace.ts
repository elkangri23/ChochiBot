/**
 * Skill auto-generada por ChochiBot
 * Nombre: google_workspace
 * Descripción: Integración completa con Google Workspace usando CLI gog para Gmail, Calendar, Drive, Contacts, Sheets y Docs
 */

import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

/**
 * Mapeo de nombres amigables a IDs reales de Google Sheets
 */
const SHEET_ALIASES: Record<string, string> = {
    "moto": "1b5106LOrpEfZFIKXrJqiywO1nwcnD37tBTVObNNFr2M"
};

/**
 * Resuelve el ID real de una hoja a partir de un nombre amigable
 */
function resolveSheetId(nameOrId: string): string {
    return SHEET_ALIASES[nameOrId.toLowerCase()] || nameOrId;
}

/**
 * Encuentra la ruta de gog en el sistema
 */
async function findGogPath(): Promise<string | null> {
    const gogPaths = [
        "gog", // Global PATH - probamos primero
        "C:\\Users\\antho\\AppData\\Local\\Microsoft\\WinGet\\Packages\\steipete.gogcli_Microsoft.Winget.Source_8wekyb3d8bbwe\\gog.exe", // Path actual de winget
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

export const definition = {
    name: "google_workspace",
    description: "Maneja Gmail, Calendar, Drive, Contacts, Sheets y Docs usando CLI gog. Permite buscar emails, crear eventos, gestionar archivos y más.",
    parameters: {
        type: "object",
        properties: {
            service: {
                type: "string",
                enum: ["gmail", "calendar", "drive", "contacts", "sheets", "docs", "auth"],
                description: "Servicio de Google Workspace a usar"
            },
            action: {
                type: "string",
                description: "Acción específica (search, send, create, list, get, update, etc.)"
            },
            params: {
                type: "object",
                description: "Parámetros específicos según el servicio y acción",
                properties: {
                    // Gmail
                    to: { type: "string", description: "Destinatario del email" },
                    subject: { type: "string", description: "Asunto del email" },
                    body: { type: "string", description: "Cuerpo del email" },
                    query: { type: "string", description: "Query de búsqueda" },
                    max: { type: "number", description: "Máximo número de resultados" },
                    account: { type: "string", description: "Cuenta de Gmail a usar" },
                    
                    // Calendar
                    calendarId: { type: "string", description: "ID del calendario" },
                    summary: { type: "string", description: "Título del evento" },
                    from: { type: "string", description: "Fecha/hora inicio (ISO)" },
                    to_time: { type: "string", description: "Fecha/hora fin (ISO)" },
                    eventColor: { type: "number", description: "Color del evento (1-11)" },
                    eventId: { type: "string", description: "ID del evento" },
                    
                    // Drive
                    driveQuery: { type: "string", description: "Query de búsqueda en Drive" },
                    
                    // Sheets
                    sheetId: { type: "string", description: "ID de la hoja de cálculo" },
                    range: { type: "string", description: "Rango de celdas (ej: A1:D10)" },
                    values: { type: "string", description: "Valores JSON para actualizar" },
                    
                    // Docs
                    docId: { type: "string", description: "ID del documento" },
                    format: { type: "string", description: "Formato de exportación" },
                    output: { type: "string", description: "Archivo de salida" }
                }
            },
            bypassApproval: { type: "boolean", description: "Omitir aprobación humana" }
        },
        required: ["service", "action"]
    }
};

async function checkGogInstalled(): Promise<boolean> {
    const gogPath = await findGogPath();
    return gogPath !== null;
}

async function buildGogCommand(service: string, action: string, params: any = {}): Promise<string> {
    const gogPath = await findGogPath();
    if (!gogPath) {
        throw new Error("gog CLI no encontrado");
    }
    
    let cmd = `"${gogPath}"`;
    
    switch (service) {
        case "auth":
            if (action === "list") cmd += " auth list";
            else if (action === "add") cmd += ` auth add ${params.email} --services ${params.services || "gmail,calendar,drive,contacts,docs,sheets"}`;
            else if (action === "credentials") cmd += ` auth credentials ${params.credentialsPath}`;
            break;
            
        case "gmail":
            cmd += " gmail";
            if (action === "search") {
                cmd += ` search '${params.query}'`;
                if (params.max) cmd += ` --max ${params.max}`;
                if (params.account) cmd += ` --account ${params.account}`;
            }
            else if (action === "send") {
                cmd += ` send --to ${params.to} --subject "${params.subject}"`;
                if (params.body) cmd += ` --body "${params.body}"`;
                if (params.account) cmd += ` --account ${params.account}`;
            }
            else if (action === "messages") {
                cmd += ` messages search "${params.query}"`;
                if (params.max) cmd += ` --max ${params.max}`;
                if (params.account) cmd += ` --account ${params.account}`;
            }
            break;
            
        case "calendar":
            cmd += " calendar";
            if (action === "events") {
                cmd += ` events ${params.calendarId}`;
                if (params.from) cmd += ` --from ${params.from}`;
                if (params.to_time) cmd += ` --to ${params.to_time}`;
            }
            else if (action === "create") {
                cmd += ` create ${params.calendarId} --summary "${params.summary}"`;
                if (params.from) cmd += ` --from ${params.from}`;
                if (params.to_time) cmd += ` --to ${params.to_time}`;
                if (params.eventColor) cmd += ` --event-color ${params.eventColor}`;
            }
            else if (action === "update") {
                cmd += ` update ${params.calendarId} ${params.eventId}`;
                if (params.summary) cmd += ` --summary "${params.summary}"`;
                if (params.eventColor) cmd += ` --event-color ${params.eventColor}`;
            }
            else if (action === "colors") {
                cmd += " colors";
            }
            break;
            
        case "drive":
            cmd += " drive";
            if (action === "search") {
                cmd += ` search "${params.driveQuery}"`;
                if (params.max) cmd += ` --max ${params.max}`;
            }
            break;
            
        case "contacts":
            cmd += " contacts";
            if (action === "list") {
                if (params.max) cmd += ` --max ${params.max}`;
            }
            break;
            
        case "sheets":
            cmd += " sheets";
            if (action === "get") {
                const resolvedSheetId = resolveSheetId(params.sheetId);
                cmd += ` get ${resolvedSheetId} "${params.range}" --json`;
            }
            else if (action === "update") {
                const resolvedSheetId = resolveSheetId(params.sheetId);
                cmd += ` update ${resolvedSheetId} "${params.range}" --values-json '${params.values}' --input USER_ENTERED`;
            }
            else if (action === "append") {
                const resolvedSheetId = resolveSheetId(params.sheetId);
                cmd += ` append ${resolvedSheetId} "${params.range}" --values-json '${params.values}' --insert INSERT_ROWS`;
            }
            else if (action === "clear") {
                const resolvedSheetId = resolveSheetId(params.sheetId);
                cmd += ` clear ${resolvedSheetId} "${params.range}"`;
            }
            else if (action === "metadata") {
                const resolvedSheetId = resolveSheetId(params.sheetId);
                cmd += ` metadata ${resolvedSheetId} --json`;
            }
            break;
            
        case "docs":
            cmd += " docs";
            if (action === "export") {
                cmd += ` export ${params.docId}`;
                if (params.format) cmd += ` --format ${params.format}`;
                if (params.output) cmd += ` --out ${params.output}`;
            }
            else if (action === "cat") {
                cmd += ` cat ${params.docId}`;
            }
            break;
    }
    
    return cmd;
}

function isDestructiveAction(service: string, action: string): boolean {
    const destructiveActions = [
        "send", "create", "update", "append", "clear", "delete",
        "add", // para auth add
    ];
    return destructiveActions.includes(action);
}

/**
 * Procesa la salida JSON de Google Sheets para hacerla más legible
 */
function processSheetsOutput(output: string, sheetId: string, range: string): any {
    try {
        const jsonData = JSON.parse(output);
        
        // Para la hoja "moto", formatear específicamente los ciclos de carga
        if (sheetId === "moto" && jsonData.values && jsonData.values.length > 0) {
            const rows = jsonData.values;
            
            // Buscar la fila de headers (contiene "Ciclo", "Fecha", etc.)
            let headerRowIndex = -1;
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][0] === "Ciclo" || rows[i].some((cell: string) => cell && cell.toLowerCase().includes("ciclo"))) {
                    headerRowIndex = i;
                    break;
                }
            }
            
            if (headerRowIndex >= 0 && rows.length > headerRowIndex + 1) {
                const headers = rows[headerRowIndex];
                const dataRows = rows.slice(headerRowIndex + 1);
                
                // Filtrar filas que tengan datos de ciclos (ciclo numérico)
                const cycleData = dataRows
                    .filter((row: any[]) => row[0] && !isNaN(parseInt(row[0])))
                    .map((row: any[]) => {
                        const cycle: any = {};
                        headers.forEach((header: string, index: number) => {
                            if (header && row[index]) {
                                cycle[header] = row[index];
                            }
                        });
                        return cycle;
                    });
                
                if (cycleData.length > 0) {
                    // Obtener los últimos 5 ciclos
                    const last5Cycles = cycleData.slice(-5);
                    
                    return {
                        type: "moto_cycles",
                        totalCycles: cycleData.length,
                        last5Cycles,
                        summary: {
                            avgKmPerCycle: last5Cycles.reduce((sum: number, cycle: any) => sum + parseFloat(cycle["Km parcial"] || 0), 0) / last5Cycles.length,
                            totalKm: last5Cycles[last5Cycles.length - 1]?.["Km"] || 0
                        }
                    };
                }
            }
        }
        
        // Para otras hojas, devolver JSON formateado
        return {
            type: "raw_data",
            range: jsonData.range || range,
            values: jsonData.values || [],
            rowCount: jsonData.values ? jsonData.values.length : 0
        };
        
    } catch (e) {
        // Si no es JSON válido, devolver como texto
        return {
            type: "text",
            content: output
        };
    }
}

export const handler = async (args: any) => {
    try {
        const { service, action, params = {}, bypassApproval = false } = args;
        
        // Verificar si gog está instalado
        const gogInstalled = await checkGogInstalled();
        if (!gogInstalled) {
            return {
                status: "error",
                message: "❌ CLI 'gog' no está instalado. Necesitas instalarlo primero:\n" +
                        "brew install steipete/tap/gogcli\n" +
                        "Luego configurar OAuth con:\n" +
                        "gog auth credentials /path/to/client_secret.json\n" +
                        "gog auth add tu@gmail.com --services gmail,calendar,drive,contacts,docs,sheets"
            };
        }
        
        // Verificar acciones destructivas
        if (!bypassApproval && isDestructiveAction(service, action)) {
            const cmd = await buildGogCommand(service, action, params);
            return {
                status: "pending_human_approval",
                message: `🚨 **CONTROL DE SEGURIDAD** 🚨\n\nOye jefe, necesito ejecutar una acción en **${service.toUpperCase()}** (${action}).\n\n¿Me das luz verde para lanzar esto?\n\`${cmd}\``,
                toolName: "google_workspace",
                toolArgs: { service, action, params, bypassApproval: true }
            };
        }

        
        // Construir y ejecutar comando
        const command = await buildGogCommand(service, action, params);
        
        try {
            const { stdout, stderr } = await execAsync(command, { 
                timeout: 30000, // 30 segundos max
                encoding: 'utf8'
            });
            
            // Procesar la salida para Google Sheets
            let processedOutput = stdout;
            let formattedData = null;
            
            if (service === "sheets" && action === "get" && stdout) {
                const originalSheetId = params.sheetId; // Usar el ID original del parámetro
                formattedData = processSheetsOutput(stdout, originalSheetId, params.range);
                
                // Si es datos de moto, crear un mensaje más legible
                if (formattedData.type === "moto_cycles") {
                    processedOutput = `📊 **Datos de la Moto** (Total: ${formattedData.totalCycles} ciclos)\n\n` +
                        `🔋 **Últimos 5 Ciclos de Carga:**\n\n` +
                        formattedData.last5Cycles.map((cycle: any, index: number) => {
                            const cycleNum = cycle["Ciclo"] || index + 1;
                            const fecha = cycle["Fecha"] || "N/A";
                            const kmTotal = cycle["Km"] || "N/A";
                            const kmParcial = cycle["Km parcial"] || "N/A";
                            const carga = cycle["Carga restante (%)"] || "N/A";
                            
                            return `**Ciclo ${cycleNum}** (${fecha})\n` +
                                   `  📍 ${kmTotal} km total | ⚡ ${kmParcial} km recorridos | 🔋 ${carga}% restante`;
                        }).join('\n\n') + 
                        `\n\n📈 **Promedio últimos 5 ciclos:** ${formattedData.summary.avgKmPerCycle.toFixed(1)} km/ciclo`;
                }
            }
            
            return {
                status: "success",
                command,
                output: processedOutput,
                data: formattedData,
                error: stderr || null,
                service,
                action
            };
            
        } catch (execError: any) {
            return {
                status: "error", 
                command,
                message: `Error ejecutando gog: ${execError.message}`,
                details: execError.stderr || execError.stdout || null
            };
        }
        
    } catch (e: any) {
        return { 
            status: "error", 
            message: `Error en google_workspace: ${e.message}` 
        };
    }
};