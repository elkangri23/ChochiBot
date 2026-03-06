# ADR 005: Modo Seguro Integral para Entornos Locales

## Fecha
2026-03-06

## Estatus
Aceptado

## Contexto
El bot se corre en una máquina con Windows 11 o VPS de trabajo del usuario. Una alucinación o un error en las inferencias del LLM podría causar daños irremediables si decide eliminar carpetas, hacer reset en git con flag hard u otras operaciones destructivas.

## Decisión
- **El modo inicial se configura como SEGURO estricto:** 
- Al registrar herramientas intrínsecamente peligrosas (`shell_secure` o fs modo `write`) el handler intercepta de raíz la petición retornando en texto que requiere intervención humana (`status: "pending_human_approval"`).
- El **AgentLoop** lee este status e interrumpe agresivamente su ciclo de vida parando operaciones siguientes.
- Telegram se usa como canal de notificación de pausa y autorización.

## Consecuencias Positivas
- El usuario siempre posee el veto.
- El agente puede hacer propuestas complejas (Ej: Complicado comando CLI) que el usuario solo requiere aceptar.
- Evita catástrofes accidentales.

## Consecuencias Negativas
- El bot podría detenerse constantemente al ejecutar tareas rutinarias automatizadas de múltiple paso perdiendo parte de la inercia fluida, hasta perfilar la Fase 3 con comandos de "Bajo riesgo auto-aprobados".
