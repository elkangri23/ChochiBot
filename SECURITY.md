# 🔐 Seguridad y Credenciales - ChochiBot

## 🚨 IMPORTANTE: Configuración Segura de Credenciales

Este proyecto usa variables de entorno para manejar credenciales sensibles. **NUNCA** agregues archivos de credenciales al repositorio.

## 🔧 Configuración Inicial

### 1. Variables de Entorno Required

Copia `.env.example` a `.env` y configura:

```bash
cp .env.example .env
```

### 2. Google OAuth Setup

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo o selecciona existente
3. Habilita las APIs necesarias:
   - Gmail API
   - Google Calendar API
   - Google Drive API
   - Google Sheets API
   - Google Docs API
   - Contacts API

4. Crear credenciales OAuth 2.0:
   - Ir a Credenciales > Crear credenciales > ID de cliente OAuth 2.0
   - Tipo de aplicación: **Desktop/Aplicación de escritorio**
   - Descargar el JSON

5. **NO** agregues el archivo JSON al proyecto. En su lugar:
   - Abre el archivo JSON descargado
   - Copia los valores a tu archivo `.env`:

```env
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-tu-client-secret"
GOOGLE_PROJECT_ID="tu-project-id"
```

### 3. Otras Credenciales

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN="tu_telegram_bot_token"

# LLM APIs
GROQ_API_KEY="tu_groq_api_key"
OPENROUTER_API_KEY="tu_openrouter_api_key"
```

## 🛡️ Características de Seguridad

### ✅ Protecciones Implementadas:
- Variables de entorno para todas las credenciales sensibles
- `.gitignore` protege archivos `client_secret*.json`
- Generación temporal de archivos de credenciales desde variables de entorno
- Limpieza automática de archivos temporales
- Validación estricta de configuración

### ❌ Archivos que **NUNCA** debes agregar:
```
client_secret*.json
*credentials*.json
.env
*.key
*.pem
token.json
```

## 🔄 Uso del Sistema Seguro

### Configuración OAuth con Variables de Entorno:

```javascript
// El sistema automáticamente usa las variables de entorno
const result = await gogSetupHandler({
  action: 'auth_login',
  email: 'tu@gmail.com'
});
```

### Verificar Configuración:

```javascript
// Verifica que las variables estén configuradas
const result = await gogSetupHandler({
  action: 'install_check'
});
```

## 🚨 Si Expusiste Credenciales Accidentalmente

1. **INMEDIATAMENTE** revoca las credenciales en Google Cloud Console
2. Genera nuevas credenciales OAuth
3. Actualiza tus variables de entorno
4. Nunca hagas commit de archivos sensibles

## 📚 Recursos de Seguridad

- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [OAuth 2.0 Security Guidelines](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Environment Variables Security](https://12factor.net/config)

---
**🔐 Mantén tus credenciales seguras. Tu futuro yo te lo agradecerá.**