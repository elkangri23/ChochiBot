# Fases del Proyecto - ChochiBot

A continuación, se detalla la hoja de ruta del desarrollo de ChochiBot, separando las metas completadas de los horizontes a futuro.

## ✅ Fase 1: MVP y Cimientos Locales (¡COMPLETADA!)
La fase fundacional consistió en montar la estructura modular, conectar los cables y permitir las interacciones primarias.

- **Estructura y Stack:**
  - TypeScript (ESM) implementado con scripts NPM configurados (`dev`, `build`, `start`).
  - Arquitectura limpia separando `adapters`, `core`, `memory`, `tools`.
- **Cerebro (LLM Abstraction):**
  - Implementación de interfaz estandarizada `LLMProvider`.
  - Integración nativa a **Groq** vía API.
- **Base de Datos (Memoria Persistente):**
  - Instalación de SQLite con `better-sqlite3`.
  - Migración y creación inicial automática de tablas esenciales (`users`, `memories`, `projects`, `skills`, `tool_logs`).
- **Bot Framework (Telegram):**
  - Uso de `grammY`.
  - Control de accesos (Whitelist de IDs numéricos para seguridad absoluta).
  - Comandos base instalados (`/start`, `/config`, `/tools`, `/develop`).
- **Agent Loop y Herramientas Base:**
  - Ciclo de auto-resolución (procesa mensajes, detecta y ejecuta llamadas a múltiples tools en un mismo mensaje, hasta N iteraciones).
  - Tools configuradas: `get_current_time`, `shell_secure`, `filesystem`, `http_client`, `pc_integration`.
- **Modo Seguro (Fundación):**
  - Las herramientas de riesgo (escribir ficheros y comandos shell) devuelven el estado pendendiente `pending_human_approval` para pausar el loop e informar en Telegram.

---

## ⏳ Fase 2: Interactividad, Memoria Dinámica y Skills

La segunda etapa dota a ChochiBot de autonomía gestionada y una memoria capaz de moldear comportamientos.

- [x] **Aprobación Interactiva en Telegram:** Implementar botones (Inline Keyboard) en Telegram para aprobar o rechazar explícitamente las operaciones que devuelvan `pending_human_approval` (Pausadas en la Fase 1). (¡COMPLETADO!)
- [x] **Despliegue Total del Modo \`/develop\` (Planner):**
  - Refinar el prompt "Planner". (¡COMPLETADO!)
  - Tras tu confirmación sobre el "plan", el loop recorrerá la iteración de pasos automáticamente (creará repos, código o fixeará errores de un tirón). (¡COMPLETADO!)
- [x] **Sistema Activo de Memoria:**
  - Lógica para extraer *facts* o *preferences* de tus mensajes y guardarlos en SQLite (tabla `memories`). (¡COMPLETADO!)
  - Añadir de forma fluida a cada prompt inicial el sistema de memoria rescatando los datos más relevantes. (¡COMPLETADO!)
- [x] **Generación Autónoma de Skills:**
  - Lógica para inyectar código dinámico y persistir "draft skills". (¡COMPLETADO!)
  - Recargar el `toolsRegistry` bajo demanda al aprobar una skill que él mismo se haya programado. (¡COMPLETADO!)

---

## 🚀 Fase 3: Ecosistema e Integraciones (En Desarrollo - 75% completado)

Escalar horizontes con APIs de terceros, gestión de infraestructura y memoria de contexto profundo.

- [x] **Gestión de VPS:**
  - Implementación de `ssh_manager` para gestionar perfiles de servidores remotos.
  - Ejecución segura de comandos SSH con aprobación humana obligatoria. (¡COMPLETADO!)
- [x] **Integraciones Avanzadas (GitHub):**
  - Herramientas conectadas a la API de GitHub para listar repositorios, crear nuevos y gestionar Pull Requests. (¡COMPLETADO!)
- [x] **Memoria Semántica RAG:**
  - Implementación de utilidad de embeddings usando `google/text-embedding-004` (OpenRouter).
  - Almacenamiento vectorial en SQLite y búsqueda por similitud de coseno integrada en el corazón del agente. (¡COMPLETADO!)
- [x] **Ingesta de Conocimiento:** 
  - Herramienta `ingest_knowledge` para alimentar la memoria a largo plazo del bot de forma manual. (¡COMPLETADO!)
- [x] **Pruebas y Cobertura (100/80/0):**
    - Implementación de suite de tests unitarios con Vitest cubriendo >80% de líneas en módulos core (DB, Embeddings, Config). (¡COMPLETADO!)
- [ ] **Web UI Local (Próximo paso):**
  - Construir un portal web rápido (p. ej. usando Vite + React) levantado internamente.
  - Visualización cómoda de logs, histórico de base de datos, administración visual de skills y variables de entornos gráficas.
- [ ] **Notion e Integraciones de Oficina:**
  - Registrar progresos automáticamente en Notion y conectar con Google Drive/Calendar.
