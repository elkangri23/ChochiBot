/**
 * Google OAuth Setup Skill for ChochiBot
 * Manages gog CLI installation and OAuth configuration for Google Workspace services
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { validateEmail } from './types.js';
import { getSecureCredentialsPath, cleanupTempCredentials } from '../config/secure-config.js';

const execAsync = promisify(exec);

export interface GogSetupParams {
    action: 'install_check' | 'auth_status' | 'auth_login' | 'auth_logout' | 'test_services' | 'setup_guide';
    email?: string;
    services?: string;
    credentials_path?: string;
    bypassApproval?: boolean;
}

/**
 * Encuentra la ruta de gog en el sistema
 */
async function findGogPath(): Promise<string> {
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
    
    throw new Error("gog CLI no encontrado en ninguna ubicación conocida");
}

/**
 * Valida parámetros de la skill
 */
function validateParams(args: GogSetupParams): void {
    if (!args.action) {
        throw new Error("Acción requerida");
    }

    if (args.email && !validateEmail(args.email)) {
        throw new Error(`Email inválido: ${args.email}`);
    }

    const validActions = ['install_check', 'auth_status', 'auth_login', 'auth_logout', 'test_services', 'setup_guide'];
    if (!validActions.includes(args.action)) {
        throw new Error(`Acción inválida: ${args.action}. Válidas: ${validActions.join(', ')}`);
    }
}

/**
 * Ejecuta comando gog con la ruta correcta
 */
async function execGogCommand(command: string, timeout = 30000): Promise<{ stdout: string; stderr: string }> {
    const gogPath = await findGogPath();
    return execAsync(`"${gogPath}" ${command}`, { timeout });
}

export const handler = async (args: GogSetupParams): Promise<any> => {
    try {
        validateParams(args);

        const { action, email, services = "gmail,calendar,drive,contacts,docs,sheets", credentials_path, bypassApproval = false } = args;

        switch (action) {
            case "install_check":
                try {
                    const gogPath = await findGogPath();
                    const { stdout } = await execAsync(`"${gogPath}" --version`, { timeout: 5000 });
                    return {
                        status: "success",
                        message: "✅ gog CLI está instalado correctamente",
                        version: stdout.trim(),
                        path: gogPath,
                        next_steps: "Ejecuta con action 'auth_status' para verificar autenticación"
                    };
                } catch {
                    return {
                        status: "info",
                        message: "❌ gog CLI no está instalado o no se encuentra",
                        installation_commands: [
                            "# Windows (recomendado):",
                            "winget install steipete.gogcli",
                            "",
                            "# macOS (Homebrew):",
                            "brew install steipete/tap/gogcli",
                            "",
                            "# O descarga desde:",
                            "https://gogcli.sh"
                        ].join('\n'),
                        next_step: "Instala gog y vuelve a ejecutar install_check"
                    };
                }

            case "auth_status":
                try {
                    const { stdout } = await execGogCommand("auth list");
                    return {
                        status: "success",
                        message: "Estado de autenticación:",
                        accounts: stdout.trim() || "No hay cuentas configuradas"
                    };
                } catch {
                    return {
                        status: "info",
                        message: "No hay cuentas autenticadas. Ejecuta action 'auth_login' primero."
                    };
                }

            case "auth_login":
                if (!email) {
                    return {
                        status: "error",
                        message: "Email es requerido para autenticación"
                    };
                }

                if (!bypassApproval) {
                    return {
                        status: "requires_approval",
                        message: `Se configurará OAuth para ${email}`,
                        warning: "Esto abrirá el navegador para autenticación OAuth"
                    };
                }

                try {
                    let tempCredentialsPath: string | null = null;
                    
                    try {
                        // Use secure credentials from environment variables
                        if (!credentials_path) {
                            tempCredentialsPath = await getSecureCredentialsPath();
                            console.log('✅ Using secure credentials from environment variables');
                        } else if (fs.existsSync(credentials_path)) {
                            tempCredentialsPath = credentials_path;
                        } else {
                            tempCredentialsPath = await getSecureCredentialsPath();
                        }
                        
                        // Set up credentials in gog CLI
                        try {
                            await execGogCommand(`auth credentials set "${tempCredentialsPath}"`);
                        } catch (credError) {
                            // Credentials might already be set, continue
                            console.log("Credentials info:", credError);
                        }
                        
                        // Add the account
                        const { stdout, stderr } = await execGogCommand(`auth add ${email}`, 60000);
                        
                        return {
                            status: "success",
                            message: `✅ Cuenta ${email} configurada correctamente usando credenciales seguras`,
                            output: stdout.trim(),
                            stderr: stderr.trim() || null,
                            security_note: "Credenciales cargadas desde variables de entorno (seguro)"
                        };
                        
                    } finally {
                        // Clean up temporary credentials file if we created one
                        if (tempCredentialsPath && tempCredentialsPath.includes('temp')) {
                            cleanupTempCredentials(tempCredentialsPath);
                        }
                    }
                    
                } catch (error) {
                    return {
                        status: "error",
                        message: "Error al configurar cuenta OAuth",
                        error: error instanceof Error ? error.message : String(error),
                        help: "Verifica que las variables de entorno GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, y GOOGLE_PROJECT_ID estén configuradas en .env"
                    };
                }

            case "auth_logout":
                if (!bypassApproval) {
                    return {
                        status: "requires_approval",
                        message: email ? `Se eliminará la cuenta: ${email}` : "Se eliminarán todas las cuentas",
                        warning: "Esta acción no se puede deshacer"
                    };
                }

                try {
                    const command = email ? `auth remove ${email}` : "auth remove --all";
                    const { stdout } = await execGogCommand(command);
                    
                    return {
                        status: "success",
                        message: email ? `✅ Cuenta ${email} eliminada` : "✅ Todas las cuentas eliminadas",
                        output: stdout.trim()
                    };
                } catch (error) {
                    return {
                        status: "error",
                        message: "Error al eliminar cuenta(s)",
                        error: error instanceof Error ? error.message : String(error)
                    };
                }

            case "test_services":
                if (!email) {
                    return {
                        status: "error",
                        message: "Email es requerido para test de servicios"
                    };
                }

                try {
                    const testCommands = [
                        { service: "gmail", cmd: `gmail search "newer_than:1d" --account "${email}" --limit 1` },
                        { service: "calendar", cmd: `calendar colors --account "${email}"` },
                        { service: "drive", cmd: `drive ls --account "${email}" --limit 1` },
                    ];

                    const testResults = [];

                    for (const test of testCommands) {
                        try {
                            const { stdout } = await execGogCommand(test.cmd, 10000);
                            testResults.push({
                                service: test.service,
                                status: "✅ OK",
                                output: stdout.trim() ? "Datos recibidos correctamente" : "Sin resultados"
                            });
                        } catch (error) {
                            testResults.push({
                                service: test.service,
                                status: "❌ Error",
                                error: error instanceof Error ? error.message : String(error)
                            });
                        }
                    }

                    return {
                        status: "success",
                        message: `Resultados de test para ${email}:`,
                        test_results: testResults,
                        summary: testResults.map(r => `${r.service}: ${r.status}`).join(', ')
                    };
                } catch (error) {
                    return {
                        status: "error",
                        message: "Error en test de servicios",
                        error: error instanceof Error ? error.message : String(error)
                    };
                }

            case "setup_guide":
                return {
                    status: "info",
                    message: "📋 Guía completa de configuración Google Workspace",
                    setup_steps: [
                        "1️⃣ VERIFICAR INSTALACIÓN:",
                        "   Ejecuta: { action: 'install_check' }",
                        "",
                        "2️⃣ CREAR PROYECTO EN GOOGLE CLOUD:",
                        "   • Ve a: https://console.cloud.google.com/",
                        "   • Crea un proyecto nuevo o selecciona uno existente",
                        "   • Habilita las APIs necesarias:",
                        "     - Gmail API",
                        "     - Google Calendar API", 
                        "     - Google Drive API",
                        "     - Google Sheets API",
                        "     - Google Docs API",
                        "     - Contacts API",
                        "",
                        "3️⃣ CONFIGURAR OAUTH:",
                        "   • En Credenciales > Crear credenciales > ID de cliente OAuth 2.0",
                        "   • Tipo de aplicación: Desktop/Aplicación de escritorio",
                        "   • Descarga el archivo client_secret.json",
                        "",
                        "4️⃣ AÑADIR CUENTA:",
                        "   { action: 'auth_login', email: 'tu@gmail.com' }",
                        "",
                        "5️⃣ VERIFICAR:",
                        "   { action: 'auth_status' }",
                        "   { action: 'test_services', email: 'tu@gmail.com' }"
                    ].join('\n'),
                    helpful_links: [
                        "• Documentación gog CLI: https://gogcli.sh",
                        "• Google Cloud Console: https://console.cloud.google.com/",
                        "• OAuth Setup Guide: https://developers.google.com/workspace/guides/create-credentials"
                    ]
                };

            default:
                return {
                    status: "error",
                    message: `Acción no válida: ${action}. Acciones válidas: install_check, auth_status, auth_login, auth_logout, test_services, setup_guide`
                };
        }

    } catch (error) {
        return {
            status: "error",
            message: "Error inesperado en gog_setup",
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

export const skill = {
    name: 'gog_setup',
    description: 'Configura y gestiona gog CLI para acceso a Google Workspace (Gmail, Calendar, Drive, etc.)',
    parameters: {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['install_check', 'auth_status', 'auth_login', 'auth_logout', 'test_services', 'setup_guide'],
                description: 'Acción a ejecutar'
            },
            email: {
                type: 'string',
                description: 'Email de la cuenta de Google (requerido para auth_login, auth_logout, test_services)'
            },
            services: {
                type: 'string',
                default: 'gmail,calendar,drive,contacts,docs,sheets',
                description: 'Servicios a habilitar (separados por comas)'
            },
            credentials_path: {
                type: 'string',
                description: 'Ruta al archivo client_secret.json para OAuth'
            },
            bypassApproval: {
                type: 'boolean',
                default: false,
                description: 'Ejecutar sin pedir aprobación (usar con cuidado)'
            }
        },
        required: ['action']
    },
    handler
};