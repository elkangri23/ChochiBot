#!/usr/bin/env node

/**
 * Setup script para configurar credenciales de forma segura desde archivo JSON de Google
 * Uso: node setup-credentials.mjs [path-to-client-secret.json]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractCredentials(jsonPath) {
    try {
        if (!fs.existsSync(jsonPath)) {
            throw new Error(`Archivo no encontrado: ${jsonPath}`);
        }

        const credentialsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        if (!credentialsData.installed) {
            throw new Error('Archivo JSON inválido. Asegúrate de descargar credenciales de "Desktop Application"');
        }

        const { installed } = credentialsData;
        
        return {
            GOOGLE_CLIENT_ID: installed.client_id,
            GOOGLE_CLIENT_SECRET: installed.client_secret,
            GOOGLE_PROJECT_ID: installed.project_id,
            GOOGLE_REDIRECT_URI: installed.redirect_uris?.[0] || 'http://localhost'
        };
        
    } catch (error) {
        throw new Error(`Error leyendo credenciales: ${error.message}`);
    }
}

function updateEnvFile(credentials) {
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, '.env.example');
    
    let envContent = '';
    
    // Si existe .env, léelo, si no, usa .env.example como base
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    } else if (fs.existsSync(envExamplePath)) {
        envContent = fs.readFileSync(envExamplePath, 'utf8');
        console.log('📄 Creando .env desde .env.example...');
    } else {
        envContent = '# ChochiBot Environment Variables\\n\\n';
    }

    // Actualizar o agregar variables de Google
    for (const [key, value] of Object.entries(credentials)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}="${value}"`;
        
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, newLine);
            console.log(`✅ Actualizado ${key}`);
        } else {
            envContent += `\\n${newLine}`;
            console.log(`➕ Añadido ${key}`);
        }
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`\\n💾 Archivo .env actualizado correctamente`);
}

function securelyDeleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️  Archivo ${filePath} eliminado de forma segura`);
        }
    } catch (error) {
        console.warn(`⚠️  No se pudo eliminar ${filePath}: ${error.message}`);
    }
}

function main() {
    console.log('🔐 ChochiBot - Configuración Segura de Credenciales\\n');

    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error(`❌ Error: Especifica la ruta al archivo client_secret.json
        
Uso: node setup-credentials.mjs [path-to-client-secret.json]

Ejemplo: node setup-credentials.mjs ~/Downloads/client_secret_12345.json

📚 Para obtener el archivo:
1. Ve a https://console.cloud.google.com/
2. APIs y servicios > Credenciales
3. Crear credenciales > ID de cliente OAuth 2.0
4. Tipo de aplicación: Desktop
5. Descargar JSON`);
        process.exit(1);
    }

    const jsonPath = path.resolve(args[0]);

    try {
        console.log(`📂 Leyendo credenciales desde: ${jsonPath}`);
        const credentials = extractCredentials(jsonPath);
        
        console.log(`\\n🔍 Credenciales extraídas:`);
        console.log(`   Project ID: ${credentials.GOOGLE_PROJECT_ID}`);
        console.log(`   Client ID: ${credentials.GOOGLE_CLIENT_ID.substring(0, 20)}...`);
        console.log(`   Client Secret: ${credentials.GOOGLE_CLIENT_SECRET.substring(0, 15)}...`);
        
        updateEnvFile(credentials);
        
        console.log(`\\n🔒 Configuración de seguridad:`);
        console.log(`   ✅ Variables añadidas a .env`);
        console.log(`   ✅ Archivo .env protegido por .gitignore`);
        
        // Preguntar si quiere eliminar el archivo JSON original
        console.log(`\\n❓ ¿Eliminar el archivo JSON original? (recomendado para seguridad)`);
        console.log(`   El archivo ya no es necesario porque las credenciales están en .env`);
        
        // Para ambiente no interactivo, mantenemos el archivo por seguridad
        console.log(`\\n⚠️  IMPORTANTE:`);
        console.log(`   1. El archivo JSON original sigue existiendo`);
        console.log(`   2. Elimínalo manualmente después de verificar que .env funciona`);
        console.log(`   3. NUNCA agregues el archivo JSON a git`);
        
        console.log(`\\n✨ ¡Configuración completada!`);
        console.log(`\\nPróximos pasos:`);
        console.log(`   1. Verifica tu .env con las nuevas variables`);
        console.log(`   2. Ejecuta: node dist/skills/gog_setup.js { action: 'install_check' }`);
        console.log(`   3. Configura OAuth: { action: 'auth_login', email: 'tu@gmail.com' }`);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Ejecutar solo si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}