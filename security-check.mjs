#!/usr/bin/env node

/**
 * Script de verificación de seguridad para ChochiBot
 * Verifica que todas las protecciones de seguridad estén en lugar
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkFile(filePath, description) {
    const exists = fs.existsSync(path.join(__dirname, filePath));
    console.log(`${exists ? '✅' : '❌'} ${description}`);
    return exists;
}

function checkGitignorePattern(pattern) {
    const gitignorePath = path.join(__dirname, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
        console.log(`❌ .gitignore no existe`);
        return false;
    }
    
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const isProtected = content.includes(pattern);
    console.log(`${isProtected ? '✅' : '❌'} .gitignore protege: ${pattern}`);
    return isProtected;
}

function findSensitiveFiles() {
    const sensitivePatterns = [
        /client_secret.*\.json$/,
        /credentials?\.json$/,
        /\.key$/,
        /\.pem$/,
        /token\.json$/
    ];
    
    function scanDirectory(dir, results = []) {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const relativePath = path.relative(__dirname, fullPath);
            
            // Skip node_modules and .git
            if (file === 'node_modules' || file === '.git' || file === 'dist') {
                continue;
            }
            
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scanDirectory(fullPath, results);
            } else {
                // Check if file matches sensitive patterns
                for (const pattern of sensitivePatterns) {
                    if (pattern.test(file)) {
                        results.push(relativePath);
                        break;
                    }
                }
            }
        }
        
        return results;
    }
    
    return scanDirectory(__dirname);
}

function checkEnvironmentTemplate() {
    const envExamplePath = path.join(__dirname, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
        console.log('❌ .env.example no existe');
        return false;
    }
    
    const content = fs.readFileSync(envExamplePath, 'utf8');
    const requiredVars = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_PROJECT_ID',
        'TELEGRAM_BOT_TOKEN'
    ];
    
    let allPresent = true;
    for (const varName of requiredVars) {
        const isPresent = content.includes(varName);
        console.log(`${isPresent ? '✅' : '❌'} .env.example incluye: ${varName}`);
        if (!isPresent) allPresent = false;
    }
    
    return allPresent;
}

function main() {
    console.log('🔐 ChochiBot - Verificación de Seguridad\n');

    let securityScore = 0;
    const maxScore = 15;

    console.log('📁 Archivos de Configuración:');
    if (checkFile('.env.example', '.env.example existe (template de configuración)')) securityScore++;
    if (checkFile('.gitignore', '.gitignore existe (protección de archivos)')) securityScore++;
    if (checkFile('SECURITY.md', 'SECURITY.md existe (documentación de seguridad)')) securityScore++;
    if (checkFile('setup-credentials.mjs', 'setup-credentials.mjs existe (script de configuración)')) securityScore++;
    if (checkFile('src/config/secure-config.ts', 'secure-config.ts existe (sistema seguro)')) securityScore++;

    console.log('\n🛡️ Protecciones .gitignore:');
    if (checkGitignorePattern('client_secret*.json')) securityScore++;
    if (checkGitignorePattern('.env')) securityScore++;
    if (checkGitignorePattern('credentials/')) securityScore++;
    if (checkGitignorePattern('*.key')) securityScore++;

    console.log('\n📋 Variables de Entorno:');
    if (checkEnvironmentTemplate()) securityScore += 2;

    console.log('\n🔍 Búsqueda de Archivos Sensibles:');
    const sensitiveFiles = findSensitiveFiles();
    if (sensitiveFiles.length === 0) {
        console.log('✅ No se encontraron archivos sensibles en el repositorio');
        securityScore += 3;
    } else {
        console.log('⚠️ Archivos sensibles encontrados:');
        sensitiveFiles.forEach(file => {
            console.log(`   ❌ ${file}`);
        });
        console.log('\n🔧 Acción requerida: Mover estos archivos fuera del repositorio');
    }

    console.log(`\n📊 Puntuación de Seguridad: ${securityScore}/${maxScore}`);
    
    if (securityScore === maxScore) {
        console.log('🎉 ¡Excelente! Tu proyecto tiene todas las protecciones de seguridad implementadas.');
    } else if (securityScore >= maxScore * 0.8) {
        console.log('✅ Buena configuración de seguridad, considera completar los elementos faltantes.');
    } else {
        console.log('⚠️ Configuración de seguridad incompleta. Revisa los elementos marcados.');
    }

    console.log('\n📚 Recursos:');
    console.log('   - Guía de seguridad: cat SECURITY.md');
    console.log('   - Configurar credenciales: node setup-credentials.mjs');
    console.log('   - Test configuración: node test-security.mjs');
    
    process.exit(securityScore === maxScore ? 0 : 1);
}

main();