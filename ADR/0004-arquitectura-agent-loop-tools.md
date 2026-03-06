# ADR 004: Arquitectura General de Agent Loop y Sistema de Tools

## Fecha
2026-03-06

## Estatus
Aceptado

## Contexto
Los flujos de LLM actuales ofrecen funciones estructuradas de llamado (Tool Callings). Para que el agente pueda encadenar pensamientos (ej: "leer listado de ficheros" -> "ver contenido en específico" -> "generar respuesta final"), no basta procesar peticiones y respuestas simples una por una.

## Decisión
- Instaurar **AgentLoop**, una clase núcleo que acepta la retención y administración del historial de un usuario, pidiendo respuesta al LLM, leyendo el flag de `tool_calls` y ejecutándolos.
- El propio ciclo inserta el resultado de las herramientas inyectado como un mensaje `role="tool"` y continúa un loop cíclico con un máximo predefinido de N iteraciones, para evitar estancamientos infinitos si el LLM se confunde repetidamente.
- Sistema de tools centralizado con auto-descubrimiento en un `toolsRegistry` que proveerá dinámicamente el diccionario de JSON Schemas requeridos por el LLM.

## Consecuencias Positivas
- Flexibilidad total en adición de tools dinámicas; el Loop no conoce ni importa cuáles herramientas existen, solo las descubre.
- Unificación del registro, previniendo duplicados y forzando tipado.

## Consecuencias Negativas
- Potencial de sobre-consumo de Tokens por contexto si en las iteraciones el historial crece debido a herramientas de alto *output* que devuelvan demasiada información leída en un archivo grande (el LLM traga logs enteros).
