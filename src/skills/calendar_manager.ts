/**
 * Skill auto-generada por ChochiBot
 * Nombre: calendar_manager 
 * Descripción: Gestor de Google Calendar simplificado para crear, buscar y gestionar eventos
 */

import { exec } from "child_process";
import util from "util";
import { CalendarActionParams, SkillResponse, validateDate, validateTime, validateEventColor } from "./types.js";

const execAsync = util.promisify(exec);

export const definition = {
    name: "calendar_manager",
    description: "Gestor de Google Calendar. Crea eventos, busca disponibilidad, lista próximos eventos y gestiona calendario.",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string", 
                enum: ["upcoming", "today", "create_event", "create_meeting", "show_colors", "busy_check"],
                description: "Acción a realizar en Calendar"
            },
            title: { type: "string", description: "Título del evento" },
            date: { type: "string", description: "Fecha (YYYY-MM-DD)" },
            start_time: { type: "string", description: "Hora inicio (HH:MM)" },
            end_time: { type: "string", description: "Hora fin (HH:MM)" },
            duration_hours: { type: "number", description: "Duración en horas (alternativa a end_time)" },
            color: { type: "number", description: "Color del evento (1-11)" },
            calendar_id: { type: "string", description: "ID específico del calendario", default: "primary" },
            days_ahead: { type: "number", description: "Días hacia adelante", default: 7 },
            bypassApproval: { type: "boolean", description: "Omitir aprobación" }
        },
        required: ["action"]
    }
};

// Validation function - strict input validation per deployment-standards
function validateCalendarParams(params: CalendarActionParams): string | null {
    const { action, title, date, start_time, end_time, duration_hours, color, days_ahead } = params;
    
    // Validation for creation actions
    if (action === "create_event" || action === "create_meeting") {
        if (!title || title.trim().length === 0) {
            return "Título requerido";
        }
        if (!date || !validateDate(date)) {
            return "Fecha requerida y debe tener formato YYYY-MM-DD válido";
        }
        if (!start_time || !validateTime(start_time)) {
            return "Hora de inicio requerida y debe tener formato HH:MM válido";
        }
        if (end_time && !validateTime(end_time)) {
            return "Hora de fin debe tener formato HH:MM válido";
        }
        if (duration_hours !== undefined && (duration_hours <= 0 || duration_hours > 24)) {
            return "Duración debe estar entre 0 y 24 horas";
        }
        if (color !== undefined && !validateEventColor(color)) {
            return "Color debe estar entre 1 y 11";
        }
    }
    
    if (action === "busy_check" && (!date || !validateDate(date))) {
        return "Fecha requerida y válida para verificar disponibilidad";
    }
    
    if (days_ahead !== undefined && (days_ahead < 1 || days_ahead > 90)) {
        return "Días hacia adelante debe estar entre 1 y 90";
    }
    
    return null;
}

// Date/time formatting functions
function formatDateTimeISO(date: string, time: string): string {
    const datetime = new Date(`${date}T${time}:00`);
    return datetime.toISOString();
}

function addHours(isoString: string, hours: number): string {
    const date = new Date(isoString);
    date.setHours(date.getHours() + hours);
    return date.toISOString();
}

// Check gog installation
async function checkGogInstallation(): Promise<SkillResponse | null> {
    try {
        await execAsync("gog --version");
        return null;
    } catch {
        return {
            status: "error",
            message: "❌ Necesitas instalar 'gog' CLI:\nbrew install steipete/tap/gogcli\n\nY configurar OAuth para Calendar"
        };
    }
}

// Build calendar command - separate function per SRP
function buildCalendarCommand(params: CalendarActionParams): string {
    const { action, calendar_id = "primary", days_ahead = 7, title, date, start_time, end_time, duration_hours, color } = params;
    let command = "gog calendar";

    switch (action) {
        case "upcoming":
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days_ahead);
            command += ` events ${calendar_id} --from ${new Date().toISOString()} --to ${futureDate.toISOString()}`;
            break;
            
        case "today":
            const today = new Date().toISOString().split('T')[0];
            const todayStart = `${today}T00:00:00Z`;
            const todayEnd = `${today}T23:59:59Z`;
            command += ` events ${calendar_id} --from ${todayStart} --to ${todayEnd}`;
            break;
            
        case "create_event":
        case "create_meeting":
            const startISO = formatDateTimeISO(date!, start_time!);
            let endISO: string;
            
            if (end_time) {
                endISO = formatDateTimeISO(date!, end_time);
            } else if (duration_hours) {
                endISO = addHours(startISO, duration_hours);
            } else {
                endISO = addHours(startISO, 1); // Default 1 hour
            }
            
            const eventTitle = action === "create_meeting" ? `🤝 ${title}` : title;
            command += ` create ${calendar_id} --summary "${eventTitle}" --from "${startISO}" --to "${endISO}"`;
            
            const eventColor = color || (action === "create_meeting" ? 9 : undefined);
            if (eventColor) command += ` --event-color ${eventColor}`;
            break;
            
        case "show_colors":
            command += " colors";
            break;
            
        case "busy_check":
            const checkStart = `${date}T08:00:00Z`;
            const checkEnd = `${date}T20:00:00Z`;
            command += ` events ${calendar_id} --from ${checkStart} --to ${checkEnd}`;
            break;
    }
    
    return command;
}

// Check if action requires approval
function requiresApproval(action: string): boolean {
    return action === "create_event" || action === "create_meeting";
}

// Format calendar results
function formatCalendarResults(stdout: string, action: string): SkillResponse {
    if (action === "show_colors") {
        return {
            status: "success",
            output: stdout,
            formatted_output: "🎨 Aquí tienes los colores que puedes usar para tus eventos:\n\n" + stdout
        };
    }
    
    if (action === "upcoming" || action === "today" || action === "busy_check") {
        const allLines = stdout.trim().split('\n').filter(line => line.length > 0);
        
        // Skip header if present (ID, FROM, TO, SUMMARY)
        const dataLines = allLines.length > 0 && allLines[0].includes("ID") && allLines[0].includes("FROM")
            ? allLines.slice(1)
            : allLines;

        if (dataLines.length === 0) {
            let emptyMsg = "📅 No hay eventos programados en este período, jefe.";
            if (action === "today") emptyMsg = "📅 ¡Día libre! No tienes nada en la agenda para hoy. 😎";
            
            return {
                status: "success",
                output: stdout,
                events_found: 0,
                formatted_output: emptyMsg
            };
        }

        const formattedEvents = dataLines.map((line) => {
            const parts = line.trim().split(/\s{2,}/);
            
            if (parts.length >= 4) {
                // parts[1] is Start Time (ISO), parts[2] is End Time (ISO), parts[3] is Summary
                const startISO = parts[1];
                let timeStr = "";
                
                try {
                    const start = new Date(startISO);
                    // Format: "10 Mar, 12:30"
                    const day = start.getDate();
                    const month = start.toLocaleString('es-ES', { month: 'short' });
                    const time = start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    timeStr = `${day} ${month}, ${time}`;
                } catch {
                    timeStr = startISO.replace('T', ' ').split(':').slice(0, 2).join(':');
                }
                
                const summary = parts[3];
                return `🕒 **${timeStr}**: ${summary}`;
            }
            
            return `• ${line}`;
        });

        const intro = action === "today" 
            ? "📅 Esto es lo que tienes para hoy, jefe:" 
            : `📅 He encontrado ${dataLines.length} eventos en tu agenda:`;

        return {
            status: "success",
            output: stdout,
            events_found: dataLines.length,
            formatted_output: `${intro}\n\n${formattedEvents.join('\n')}`
        };
    }
    
    return {
        status: "success",
        output: stdout
    };
}


export const handler = async (args: CalendarActionParams): Promise<SkillResponse> => {
    try {
        // Strict validation per deployment-standards
        const validationError = validateCalendarParams(args);
        if (validationError) {
            return { status: "error", message: validationError };
        }

        // Check gog installation
        const installError = await checkGogInstallation();
        if (installError) return installError;

        const command = buildCalendarCommand(args);

        // Approval check for creation operations
        if (requiresApproval(args.action) && !args.bypassApproval) {
            const eventDetails = args.action === "create_meeting" ? 
                `🤝 Meeting: ${args.title}` : `📅 Evento: ${args.title}`;
            return {
                status: "pending_human_approval",
                message: `${eventDetails}\nFecha: ${args.date} ${args.start_time}\nDuración: ${args.duration_hours || 1}h\nCalendario: ${args.calendar_id || 'primary'}\n\n¿Crear evento?`,
                toolName: "calendar_manager",
                toolArgs: { ...args, bypassApproval: true }
            };
        }

        // Execute command
        const { stdout, stderr } = await execAsync(command, { 
            timeout: 15000,
            encoding: 'utf8'
        });

        // Format results
        const result = formatCalendarResults(stdout, args.action);
        result.command = command;
        
        if (stderr) {
            result.warnings = stderr;
        }

        return result;

    } catch (e: unknown) {
        const error = e as Error;
        return { 
            status: "error", 
            message: `Error en Calendar: ${error.message}` 
        };
    }
};