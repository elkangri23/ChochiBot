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

- [ ] **Aprobación Interactiva en Telegram:** Implementar botones (Inline Keyboard) en Telegram para aprobar o rechazar explícitamente las operaciones que devuelvan `pending_human_approval` (Pausadas en la Fase 1).
- [ ] **Despliegue Total del Modo \`/develop\` (Planner):**
  - Refinar el prompt "Planner".
  - Tras tu confirmación sobre el "plan", el loop recorrerá la iteración de pasos automáticamente (creará repos, código o fixeará errores de un tirón).
- [ ] **Sistema Activo de Memoria:**
  - Lógica para extraer *facts* o *preferences* de tus mensajes y guardarlos en SQLite (tabla `memories`).
  - Añadir de forma fluida a cada prompt inicial el sistema de memoria rescatando los datos más relevantes.
- [ ] **Generación Autónoma de Skills:**
  - Lógica para inyectar código dinámico y persistir "draft skills".
  - Recargar el `toolsRegistry` bajo demanda al aprobar una skill que él mismo se haya programado.

---

## 🔮 Fase 3: Ecosistema e Integraciones (En Planificación)

Escalar horizontes con APIs de terceros e interfaces ricas.

- [ ] **Integraciones Prioritarias:**
  - Herramientas conectadas a su propia base en Google (Drive/Calendar), Notion (para registrar progresos), y GitHub.
  - Conexión con un n8n local para automatizar triggers o arrancar workflows preprogramados.
- [ ] **Gestión de VPS:**
  - En lugar de solo shell local, incluir wrappers SSH para poder aplicar updates, montar dockers o verificar métricas de tus VPS remotas.
- [ ] **Web UI Local:**
  - Construir un portal web rápido (p. ej. usando Vite + React) levantado internamente.
  - Visualización cómoda de logs, histórico de base de datos, administración visual de skills y variables de entornos gráficas.
- [ ] **Memoria Semántica RAG:**
  - Indexar el log de acciones, proyectos viejos y configuraciones almacenando *embeddings* para un "recuerdo" con contexto preciso a largo plazo.
