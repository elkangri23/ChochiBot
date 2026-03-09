# 🎯 Guía de Google Workspace Skills para ChochiBot

ChochiBot ahora tiene 4 nuevas skills poderosas para Google Workspace usando CLI `gog`:

## 🛠️ Skills Disponibles

### 1. `gog_setup` - Configuración Inicial ⚙️
**Configurar OAuth y autenticación para Google Workspace**

**Acciones disponibles:**
- `install_check` - Verifica si gog CLI está instalado
- `auth_status` - Muestra estado de autenticación
- `add_account` - Añade nueva cuenta Google
- `setup_guide` - Guía completa de configuración
- `test_services` - Prueba todos los servicios

**Ejemplos:**
```
Verifica si tienes gog instalado y guía de setup
Configura OAuth para Google Workspace
Añade mi cuenta usuario@gmail.com
Prueba los servicios de Google
```

### 2. `gmail_assistant` - Gmail Simplificado 📧
**Buscar, enviar y gestionar correos fácilmente**

**Acciones disponibles:**
- `search` - Buscar emails con criterios
- `send` - Enviar email
- `send_reply` - Responder a un email
- `recent` - Emails recientes (últimos 7 días)
- `unread` - Emails no leídos
- `from_sender` - Emails de remitente específico

**Ejemplos:**
```
Busca emails de amazon en los últimos 3 días
Envía email a juan@ejemplo.com con asunto "Reunión" y mensaje "Hola Juan, ¿podemos reunirnos mañana?"
Muestra mis emails no leídos
Busca emails de support@github.com
```

### 3. `calendar_manager` - Google Calendar 📅
**Crear eventos, ver calendario y gestionar tiempo**

**Acciones disponibles:**
- `upcoming` - Próximos eventos
- `today` - Eventos de hoy
- `create_event` - Crear evento nuevo
- `create_meeting` - Crear reunión (con emoji 🤝)
- `show_colors` - Colores disponibles
- `busy_check` - Ver disponibilidad en fecha

**Ejemplos:**
```
Muestra mis eventos de hoy
Crea evento "Dentista" el 2026-03-15 a las 10:00 por 1 hora
Crea meeting "Standup diario" para mañana a las 09:00
Mis próximos eventos de la semana
¿Qué colores puedo usar en eventos?
```

### 4. `google_workspace` - Google Workspace Completo 🌐
**Herramienta avanzada para Gmail, Calendar, Drive, Docs, Sheets**

**Servicios soportados:**
- `gmail` - Management completo de Gmail
- `calendar` - Gestión avanzada de Calendar
- `drive` - Búsquedas y gestión de Drive
- `contacts` - Gestión de contactos
- `sheets` - Leer/escribir en Sheets
- `docs` - Exportar y leer documentos

**Ejemplos avanzados:**
```
Busca en Drive archivos PDF de "proyecto"
Lee datos de la hoja de cálculo ID-123 rango A1:C10
Exporta el documento ID-456 como texto
Lista mis primeros 20 contactos
```

## 🚀 Configuración Inicial Requerida

### Paso 1: Instalar gog CLI
```bash
# macOS (Homebrew)
brew install steipete/tap/gogcli

# O descarga desde: https://gogcli.sh
```

### Paso 2: Configurar OAuth
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea proyecto o selecciona uno existente
3. Habilita APIs: Gmail, Calendar, Drive, Contacts, Docs, Sheets
4. Crea credenciales OAuth 2.0
5. Descarga `client_secret.json`

### Paso 3: Configurar gog
```bash
gog auth credentials /path/to/client_secret.json
gog auth add tu@gmail.com --services gmail,calendar,drive,contacts,docs,sheets
gog auth list  # verificar
```

## 📋 Comandos ChochiBot para Empezar

1. **Setup inicial:**
   ```
   Verifica instalación de gog y guía de setup
   ```

2. **Primeras pruebas:**
   ```
   Muestra mis emails no leídos
   Muestra mis eventos de hoy
   ```

3. **Acciones avanzadas:**
   ```
   Crea evento "Code review" mañana 14:00 por 2 horas color 9
   Busca emails de github.com en los últimos 5 días
   ```

## ⚡ Tips de Uso

- **Seguridad:** Todas las operaciones de envío/creación requieren aprobación humana
- **Cuentas múltiples:** Puedes especificar `account: "tu2@gmail.com"` para usar cuenta específica
- **Colores:** Calendar tiene 11 colores (1-11), usa `show_colors` para verlos
- **Formatos de fecha:** 
  - Fechas: `YYYY-MM-DD` (ej: `2026-03-15`)
  - Horas: `HH:MM` (ej: `14:30`)
- **Límites:** Por defecto 10 resultados máx, ajustable con `limit`

## 🔧 Solución de Problemas

**Error "gog not found":**
- Instala gog CLI: `brew install steipete/tap/gogcli`

**Error de autenticación:**
- Ejecuta `gog auth list` para ver cuentas
- Re-configura: `gog auth add tu@gmail.com`

**Error de permisos API:**
- Revisa que las APIs estén habilitadas en Google Cloud Console
- Verifica scopes en OAuth

**Skills no aparecen:**
- Reinicia ChochiBot: detener y volver a ejecutar
- Verifica compilación: `npm run build`

¡Ya tienes Google Workspace integrado completamente en ChochiBot! 🎉