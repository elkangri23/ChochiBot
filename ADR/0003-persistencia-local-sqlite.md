# ADR 003: Almacenamiento con SQLite y better-sqlite3

## Fecha
2026-03-06

## Estatus
Aceptado

## Contexto
Un agente de Inteligencia Artificial que no aprende se estanca. ChochiBot requiere una memoria persistente para recordar proyectos, directivas, registrar métricas y guardar sus propias skills en texto o JSON. Necesita ser agnóstico del inicio/apagado del equipo pero ágil en lectura.

## Decisión
- Utilizar **SQLite** como una base de datos embebida, completamente local y contenida en un simple archivo `.sqlite`.
- Uso del paquete **`better-sqlite3`**: Este driver ejecuta operaciones síncronas asombrosamente rápidas lo que facilita la lectura sin sobrepoblar el código de sintaxis de promesas en sitios donde el tiempo de escritura de logs y búsquedas de IDs no requieren bloqueos importantes.
- Migraciones nativas iniciales con scripts planos de SQL en la misma fase de inicialización.

## Consecuencias Positivas
- Cero mantenimiento de servidor de bases de datos (ni Docker, ni PostgreSQL o MySQL, ni conexiones perdidas).
- Portabilidad inmediata (copiar y pegar el `.sqlite` para hacer backups de las memorias).
- Alta disponibilidad, simple de configurar el archivo mediante variable `.env`.

## Consecuencias Negativas
- Inconveniente ante operaciones asíncronas simultáneas extremadamente pesadas; lo cual no es un uso normal ni contemplado para un asistente de uso unipersonal en local.
