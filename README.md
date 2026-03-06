# ChochiBot – Tu Agente de IA Personal y Local

ChochiBot es un agente de IA automatizado, de desarrollo enfocado, que opera desde tu propia máquina (Local) interactuando contigo a través de Telegram. Su objetivo es asistirte en tareas de desarrollo, operaciones, búsqueda y gestión del sistema, manteniendo siempre el control de la seguridad.

## 🚀 Características Principales

- **Conexión Exclusiva:** Sólo atiende a los IDs de Telegram que pertenezcan a las listas de permitidos (`TELEGRAM_ALLOWED_USER_IDS`).
- **Agnóstico de LLMs:** Pensamiento distribuido mediante Groq, OpenRouter o modelos locales (Ollama).
- **Auto-Extensible:** Capacidad para generar, probar y activar sus propias habilidades (*skills*) dinámicamente.
- **Gestión de Infraestructura:** Operaciones SSH seguras y avanzadas para gestionar tus servidores VPS.
- **GitHub Avanzado:** Capacidad para interactuar con repositorios y gestionar Pull Requests.
- **Memoria Semántica de Contexto Profundo (RAG):** Recuperación inteligente de información pasada para respuestas más precisas y coherentes.
- **Loop de Agente con Aprobación Humana:** Autonomía supervisada para mayor seguridad del sistema.

## 🛠️ Stack Tecnológico

- **Lenguaje:** Node.js + TypeScript (ESModules).
- **Ejecución de desarrollo:** `tsx`.
- **Bot Framework:** `grammY` (usando Long Polling para evitar tener IPs expuestas con Webhooks).
- **Base de Datos:** SQLite empleando el driver ultrarrápido `better-sqlite3`.

## 📦 Configuración Inicial y Cómo Arrancar

1. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```

2. Configura las variables de entorno:
   Renombra o copia el archivo `.env.example` a `.env` y rellena los datos correspondientes:
   ```env
   TELEGRAM_BOT_TOKEN="tu_token_de_botfather"
   TELEGRAM_ALLOWED_USER_IDS="12345678,87654321"
   GROQ_API_KEY="tu_clave_de_groq"
   ```

3. Modos de Ejecución:
   - **Desarrollo (Hot Reload):** Utiliza este modo mientras cambies el código fuente.
     ```bash
     npm run dev
     ```
   - **Producción:** Construye el código y luego inicialo compilado.
     ```bash
     npm run build
     npm run start
     ```

## 🗺️ Fases del Proyecto

El desarrollo de ChochiBot está estructurado por etapas. Para revisar en detalle lo que se ha completado y lo que depara el futuro, consulta el documento [PROJECT_PHASES.md](./PROJECT_PHASES.md).

## 📄 Decisiones Arquitectónicas (ADRs)

El diseño del proyecto se rige por especificaciones y decisiones iniciales para asegurar escalabilidad y sencillez. Lee el porqué de cada decisión clave en la carpeta `/ADR`.