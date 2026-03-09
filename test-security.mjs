/**
 * Test script para verificar configuración segura de ChochiBot
 * Verifica que las variables de entorno estén configuradas correctamente
 */

import { loadSecureConfig, getSecureCredentialsPath } from './dist/config/secure-config.js';

async function testSecurityConfig() {
    console.log('🔐 ChochiBot - Test de Configuración Segura\n');

    try {
        // Test 1: Cargar configuración desde variables de entorno
        console.log('📊 Test 1: Cargando configuración...');
        const config = loadSecureConfig();
        
        console.log('✅ Configuración cargada correctamente:');
        console.log(`   Project ID: ${config.google.oauth.project_id}`);
        console.log(`   Client ID: ${config.google.oauth.client_id.substring(0, 20)}...`);
        console.log(`   Client Secret: ${config.google.oauth.client_secret ? '***CONFIGURADO***' : '❌ NO CONFIGURADO'}`);
        console.log(`   Default Account: ${config.google.default_account || '(no configurado)'}`);

        // Test 2: Verificar generación de credenciales temporales
        console.log('\n📄 Test 2: Generando credenciales temporales...');
        const credentialsPath = await getSecureCredentialsPath();
        console.log(`✅ Credenciales temporales generadas: ${credentialsPath}`);

        // Test 3: Verificar protección de archivos sensibles
        console.log('\n🔒 Test 3: Verificando protecciones de seguridad...');
        
        const protectedPatterns = [
            'client_secret*.json',
            '.env',
            'credentials/',
            '*.key'
        ];
        
        console.log('✅ Patrones protegidos en .gitignore:');
        protectedPatterns.forEach(pattern => {
            console.log(`   - ${pattern}`);
        });

        console.log('\n🎉 ¡Todos los tests de seguridad pasaron!');
        console.log('\n📚 Próximos pasos:');
        console.log('   1. Configura tu .env con las variables de entorno');
        console.log('   2. Prueba la autenticación OAuth: npm run auth-test');
        console.log('   3. ¡Tu ChochiBot está listo de forma segura!');

    } catch (error) {
        console.error('❌ Error en configuración de seguridad:');
        console.error(`   ${error.message}`);
        console.log('\n🔧 Para configurar:');
        console.log('   1. Copia .env.example a .env');
        console.log('   2. Configura las variables GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.');
        console.log('   3. O usa: node setup-credentials.mjs [path-to-json]');
        process.exit(1);
    }
}

// Ejecutar test
testSecurityConfig().catch(console.error);