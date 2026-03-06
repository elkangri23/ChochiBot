# ADR 002: Abstracción de Modelos LLM e Iteración con Groq

## Fecha
2026-03-06

## Estatus
Aceptado

## Contexto
El agente funcionará utilizando llamadas a Modelos de Lenguaje Grandes (LLMs) para decidir acciones. Sin embargo, no siempre un solo proveedor puede ser el deseado, o puede que en el futuro la red falle y se requiera procesar con modelos locales.

## Decisión
- **Abstracción OBLIGATORIA:** Establecer una única interfaz central `LLMProvider` que dicte el formato universal del proyecto para mensajes (`user`, `assistant`, `tool_call`).
- **Proveedor Inicial:** Comenzar implementando `GroqProvider` dado que el tiempo de respuesta es veloz y favorable para loops recurrentes.
- Estructurar el `.env` para que permita predefinir la base de Ollama y claves de otros, sin entrelazarlos en la lógica de negocio.

## Consecuencias Positivas
- Cualquier nuevo proveedor en el horizonte simplemente requerirá crear de una clase compatible con `LLMProvider`.
- Posibilidad futura de programar *fallbacks* (e.g. "Si Groq falla o satura la rate limit, cambiar clase a Ollama internamente de forma limpia").
- Interfaz muy controlada y tipificable en TypeScript.

## Consecuencias Negativas
- Existe una leve sobrecarga al traducir tipos nativos (como los de OpenAI) al standard común del Agente antes y después de cada request externa, pero justificable a largo plazo.
