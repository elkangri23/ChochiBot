# ChochiBot – Especificación de agente local

## Visión

ChochiBot es mi agente de IA personal y **local**, orientado a desarrollo y operaciones, que:

- Habla conmigo por Telegram.
- Piensa usando LLMs (Groq, OpenRouter, Ollama) con un orden de preferencia configurable.
- Ejecuta herramientas (shell, filesystem, HTTP, integraciones de servicios).
- Recuerda información de forma persistente (memoria y proyectos).
- Se auto-extiende: puede diseñar, generar y probar sus propias “skills” bajo mi supervisión.
- Se ejecuta en mi PC con Windows 11 y controla tanto mi máquina local como algunos VPS y repos de GitHub.

La prioridad máxima es: **claridad, simplicidad, seguridad y capacidad de evolución**.

---

## Objetivos funcionales

1. **Interfaz principal: Telegram**
   - Un único bot de Telegram, usando long polling (sin servidor web público).
   - Whitelist de IDs de usuario permitidos.
   - Comandos básicos:
     - `/start` – información general y ayuda.
     - `/config` – ver/ajustar configuraciones básicas (modelos, niveles de permisos, etc.).
     - `/tools` – listar tools/skills disponibles.
     - `/develop` – entrar en modo “desarrollo guiado” (planning + ejecución).
   - Modo chat normal: mensajes libres que el agente responde usando el LLM y las tools según corresponda.

2. **Cerebro LLM**
   - Proveedores soportados:
     - Groq (principal).
     - OpenRouter (fallback).
     - Ollama local (fallback y modo offline).
   - El proyecto debe tener una **capa de abstracción de modelos**, por ejemplo:
     - Interfaz `LLMProvider` con métodos tipo `generate`, `chat`, etc.
     - Implementaciones: `GroqProvider`, `OpenRouterProvider`, `OllamaProvider`.
   - El archivo `.env` definirá qué proveedor y modelo usar por defecto (no fijar aquí nombres concretos, sólo leerlos de `.env`).

3. **Agent loop**
   - Un único “agent loop” que:
     - Recibe mensajes de Telegram.
     - Construye el contexto (historial, memoria relevante, estado de proyecto).
     - Decide si sólo responde con texto o si necesita usar tools.
     - Llama a las tools de forma iterativa con un número máximo de iteraciones por mensaje.
   - Debe existir un **modo “think / planner”** que:
     - Antes de ejecutar acciones, genere un plan en texto.
     - Espere mi confirmación en algunos flujos (especialmente `/develop` y cualquier acción peligrosa).

4. **Skills / Tools iniciales**

   Implementar desde la Fase 1:

   - `get_current_time` – ejemplo simple de tool.
   - `shell_secure` – ejecutar comandos en la máquina local:
     - En Windows 11, con soporte para PowerShell.
     - Debe tener:
       - Lista blanca de comandos permitidos o patrones permitidos.
       - Clasificación de riesgo (baja/medio/alto).
       - Modo seguro: todas las acciones de riesgo medio/alto requieren confirmación explícita.
   - `filesystem` – herramientas para:
     - Leer ficheros.
     - Escribir ficheros.
     - Listar directorios.
     - Restringido a ciertas rutas configurables.
   - `http_client` – tool genérica para llamar APIs HTTP (GET/POST) con control y logging.
   - `pc_integration` – capa para:
     - Abrir VSCode en una ruta concreta.
     - Ejecutar scripts prediseñados (por ejemplo, `npm run dev`, etc.).
     - Diseñar la interfaz de tal forma que luego se pueda ampliar a abrir navegadores, Docker, etc.

   Estas tools deben estar diseñadas con:
   - Interfaces claras.
   - Tipado fuerte en TypeScript.
   - Manejo de errores y logs pensados para debugging.

5. **Sistema de skills auto-generadas**

   ChochiBot debe estar preparado para, en futuras iteraciones:

   - Recibir instrucciones como:
     - “Créate una skill para consumir la API de X con esta documentación.”
   - Generar el código de la skill:
     - Código TypeScript bajo `src/tools` o `src/skills`.
     - Un pequeño “test harness” o script de validación.
   - Guardar la skill inicialmente en estado `draft`.
   - Poder ejecutar las pruebas y, si pasan, marcar la skill como `approved`.
   - Pedirme confirmación antes de activar una skill nueva en el agent loop.

   Para esta Fase 1 no hace falta que todo el ciclo esté perfecto, pero sí:
   - Un diseño de estructura de datos (en la base de datos) para skills (`id`, `name`, `status`, `config`, etc.).
   - Una función o módulo que permita a futuro añadir nuevas skills dinámicamente.

---

## Memoria y datos

1. **Base de datos**
   - Usar **SQLite** como base de datos local.
   - Usar `better-sqlite3` como driver para Node.js.
   - Permitir que la ruta del archivo de base de datos se configure vía `.env` (`DB_PATH`).

2. **Esquema inicial (mínimo)**
   - `users`:
     - `id`
     - `telegram_id`
     - `name`
     - `created_at`
   - `memories`:
     - `id`
     - `user_id`
     - `type` (por ejemplo: `preference`, `fact`, `project`, etc.)
     - `content` (JSON o texto).
     - `created_at`
   - `projects`:
     - `id`
     - `name`
     - `path` (ruta en el sistema de archivos).
     - `repo_url` (GitHub u otros).
     - `type` (por ejemplo: `local`, `vps`, etc.)
     - `metadata` (JSON para cosas específicas).
   - `skills`:
     - `id`
     - `name`
     - `status` (`draft`, `pending_review`, `approved`, `disabled`).
     - `config` (JSON).
     - `created_at`, `updated_at`.
   - `tool_logs`:
     - `id`
     - `timestamp`
     - `tool_name`
     - `user_id` (opcional)
     - `input` (JSON)
     - `output` (JSON)
     - `status` (`success`, `error`)

3. **Memoria funcional**
   - ChochiBot debe poder:
     - Recordar datos personales básicos.
     - Recordar preferencias (stack favorito, modelos preferidos, etc.).
     - Recordar proyectos activos y su estado.
   - No es obligatorio implementar memoria semántica en la Fase 1, pero sí dejar el sistema listo para ampliarla (por ejemplo, con una tabla extra `memory_embeddings` en el futuro).

---

## Seguridad y permisos

1. **Modos de seguridad**
   - Modo inicial: **seguro**:
     - Toda acción peligrosa (shell, cambios de ficheros, operaciones sobre VPS) requiere mi confirmación explícita.
   - Más adelante: modo mixto (algunas acciones de bajo riesgo se ejecutan sin pedir confirmación).

2. **Perfiles de permisos**
   - Definir perfiles como:
     - `core` – tiempo, memoria, respuestas normales.
     - `filesystem` – lectura/escritura de ficheros.
     - `shell` – ejecución de comandos.
     - `external_services` – integraciones con API externas.
   - Debe existir una forma sencilla de ver y cambiar qué perfiles están activos (por config o comando de Telegram).

3. **Gestión de credenciales**
   - Todas las credenciales deben ir en `.env` o ficheros seguros:
     - `TELEGRAM_BOT_TOKEN`
     - `TELEGRAM_ALLOWED_USER_IDS`
     - `GROQ_API_KEY`
     - `OPENROUTER_API_KEY`
     - `DB_PATH`
     - `GOOGLE_APPLICATION_CREDENTIALS` (ruta al `service-account.json` de Google)
     - Otros que se añadan (Notion, GitHub, etc.)
   - ChochiBot debe estar preparado para:
     - Detectar que falta una credencial.
     - Explicarme por Telegram cómo conseguirla (pasos humanos).
     - Pedirme que la añada al `.env` o al fichero correspondiente.

4. **Logs**
   - Mantener un log auditable de todas las herramientas usadas, por ejemplo en:
     - Base de datos (`tool_logs`).
     - Y/o ficheros `.log`/`.jsonl`.
   - Los logs deben incluir:
     - Hora.
     - Tool usada.
     - Inputs relevantes (limitando información sensible).
     - Resultado o error.

---

## Integraciones y futuro

1. **Servicios prioritarios para futuras skills**
   - Google (Calendar, Drive, posiblemente Gmail).
   - Notion.
   - GitHub.
   - n8n (integración para lanzar workflows o ser trigger).
   - Administración de VPS (por ejemplo, vía SSH, con commands wrappers para cosas como `certbot`, `docker`, `systemctl`, etc.).

2. **Flujo `/develop`**
   - Paso 1: al ejecutar `/develop`, ChochiBot:
     - Entra en modo “planner”.
     - Pregunta el objetivo (ej: “arreglar error 500 en servicio X”, “añadir feature Y al repo Z”, “crear proyecto nuevo en ruta P”).
     - Genera un plan de pasos (incluyendo qué tools usará).
   - Paso 2: me muestra el plan para confirmación.
   - Paso 3: al confirmar:
     - Ejecuta el plan: shell, filesystem, Git, llamadas a APIs, etc.
     - Crea ramas en GitHub, aplica cambios, genera README, etc. según el caso.

3. **Web UI local**
   - El proyecto debe prepararse para que en el futuro se pueda añadir una Web UI **local**:
     - Sólo accesible desde la propia máquina.
     - Para ver logs, estado de proyectos, skills, etc.
   - No es necesario implementarla en la Fase 1, pero sí evitar decisiones que lo dificulten.

---

## Stack técnico y estructura del proyecto

1. **Tecnologías**
   - Node.js + TypeScript (ES modules).
   - Telegram bot framework: **grammY**.
   - Base de datos: SQLite + `better-sqlite3`.
   - Ejecución en desarrollo: `tsx` o similar (`npm run dev`).
   - Sistema operativo de destino: **Windows 11**, con scripts pensados para funcionar bien desde PowerShell.

2. **Estructura de carpetas propuesta**

   ```txt
   /src
     /core          # agent loop, orquestación de tools, selección de LLM
     /adapters
       /telegram    # integración con grammY
       /llm         # Groq, OpenRouter, Ollama
       /logger      # logging centralizado
     /memory        # acceso a SQLite, repositorios, migraciones iniciales
     /tools         # shell_secure, filesystem, http_client, pc_integration, get_current_time...
     /projects      # lógica de proyectos, VPS, repos, etc.
     /config        # carga de .env, validación de config
