/**
 * Secure configuration management for ChochiBot
 * Handles sensitive credentials through environment variables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GoogleOAuthConfig {
    client_id: string;
    client_secret: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    redirect_uris: string[];
}

export interface SecureConfig {
    google: {
        oauth: GoogleOAuthConfig;
        credentials_path: string;
        default_account: string;
    };
    telegram: {
        bot_token: string;
        allowed_users: string[];
    };
    security: {
        jwt_secret: string;
        encryption_key: string;
    };
}

/**
 * Load configuration from environment variables
 */
export function loadSecureConfig(): SecureConfig {
    const requiredEnvVars = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET', 
        'GOOGLE_PROJECT_ID'
    ];

    // Check for required environment variables
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}. Please check your .env file.`);
        }
    }

    const config: SecureConfig = {
        google: {
            oauth: {
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                project_id: process.env.GOOGLE_PROJECT_ID!,
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                redirect_uris: [process.env.GOOGLE_REDIRECT_URI || "http://localhost"]
            },
            credentials_path: process.env.GOOGLE_CREDENTIALS_PATH || "./credentials/client_secret.json",
            default_account: process.env.DEFAULT_GMAIL_ACCOUNT || ""
        },
        telegram: {
            bot_token: process.env.TELEGRAM_BOT_TOKEN || "",
            allowed_users: process.env.TELEGRAM_ALLOWED_USER_IDS?.split(',') || []
        },
        security: {
            jwt_secret: process.env.JWT_SECRET || "change-this-secret-key",
            encryption_key: process.env.ENCRYPTION_KEY || "change-this-encryption-key"
        }
    };

    return config;
}

/**
 * Generate temporary client_secret.json file from environment variables
 * This ensures we don't store credentials in the repository
 */
export async function generateTempCredentialsFile(): Promise<string> {
    try {
        const config = loadSecureConfig();
        
        // Create credentials directory if it doesn't exist
        const credentialsDir = path.resolve(__dirname, '..', 'credentials');
        if (!fs.existsSync(credentialsDir)) {
            fs.mkdirSync(credentialsDir, { recursive: true });
        }

        const credentials = {
            installed: config.google.oauth
        };

        const tempFilePath = path.join(credentialsDir, 'client_secret_temp.json');
        
        fs.writeFileSync(tempFilePath, JSON.stringify(credentials, null, 2));
        
        console.log('✅ Temporary credentials file generated:', tempFilePath);
        return tempFilePath;
        
    } catch (error) {
        throw new Error(`Failed to generate credentials file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Clean up temporary credentials file
 */
export function cleanupTempCredentials(filePath: string): void {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🧹 Temporary credentials file cleaned up');
        }
    } catch (error) {
        console.warn('Warning: Could not cleanup temp file:', error);
    }
}

/**
 * Get secure Google credentials path for gog CLI
 */
export async function getSecureCredentialsPath(): Promise<string> {
    // First try to use existing credentials path from config
    const config = loadSecureConfig();
    
    if (fs.existsSync(config.google.credentials_path)) {
        return config.google.credentials_path;
    }
    
    // If no existing file, generate temporary one from environment
    return generateTempCredentialsFile();
}

export default {
    loadSecureConfig,
    generateTempCredentialsFile,
    cleanupTempCredentials,
    getSecureCredentialsPath
};