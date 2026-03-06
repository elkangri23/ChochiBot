# ADR 001: Interfaz Principal vía Telegram y Long Polling

## Fecha
2026-03-06

## Estatus
Aceptado

## Contexto
ChochiBot debe ser un agente fácil de interactuar, especialmente desde el móvil o cualquier PC en cualquier momento, pero como asiste en cuestiones de sistema de una máquina local (el PC de desarrollo), su exposición al exterior es un factor de alto riesgo.

## Decisión
- **Interfaz elegida:** Telegram Bot.
- **Mecanismo:** `long-polling` (mediante la librería `grammY`), eludiendo por completo el uso de Webhooks que obligarían a abrir o exponer puertos localmente (e.g. con ngrok o en routers).
- **Seguridad extra:** Implementación de lista blanca ("Whitelist") estricta filtrando todos los mensajes según el `TELEGRAM_ALLOWED_USER_IDS` configurado.

## Consecuencias Positivas
- Ausencia de configuración de red y configuraciones de enrutamiento web complicadas.
- Seguridad robusta; el agente mismo rechaza usuarios no deseados de forma instantánea.
- Desarrollo sencillo y multiplataforma.

## Consecuencias Negativas
- Dependencia directa de la estabilidad y conectividad de los servidores de Telegram.
