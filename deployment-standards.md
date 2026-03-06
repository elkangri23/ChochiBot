# Estándares de Desarrollo y Despliegue (deployment-standards)

Este documento define las directrices, convenciones y buenas prácticas que rigen el desarrollo de **ChochiBot**. El objetivo principal es asegurar que el código generado sea en todo momento **limpio, accesible, modular y fácil de entender**, permitiendo un mantenimiento y escalabilidad a largo plazo sin fricciones.

---

## 🏗️ 1. Arquitectura y Estructura del Proyecto

### 1.1 Arquitectura Limpia (Clean Architecture)
El proyecto se divide de forma estricta según responsabilidades:
- **`src/core/`**: Lógica central y de negocio (orquestación del Agente, toma de decisiones).
- **`src/adapters/`**: Puentes hacia el mundo exterior (Telegram, llamadas a LLMs, FileSystem, APIs externas). No debe haber mezcla de responsabilidades; un error en Telegram no debe romper la lógica del Agente.
- **`src/tools/`**: Habilidades o comandos específicos (Skills). Cada herramienta debe estar aislada y probarse de forma independiente.
- **`src/memory/`**: Capa de persistencia. Base de datos SQLite y migraciones.

### 1.2 Regla de Dependencias
- Las capas internas (como `core`) **nunca** deben depender de las capas externas (como `adapters`). 
- Toda comunicación hacia afuera (por ejemplo, el modelo LLM a usar) debe hacerse a través de interfaces (`LLMProvider`) para garantizar que la plataforma sea agnóstica a la tecnología que la soporta.

---

## 💻 2. Estándares de Código (TypeScript)

### 2.1 Tipografía y Estilo
- **Tipado estricto:** El uso de `any` está terminantemente prohibido a menos que sea en respuestas HTTP genéricas imposibles de parsear. Siempre hay que proveer `interfaces` o `types` explícitos.
- **Nomenclatura:**
  - Variables y Funciones: `camelCase` (ej. `getUserHistory`).
  - Clases e Interfaces: `PascalCase` (ej. `AgentLoop`, `ToolDefinition`).
  - Variables de entorno o constantes globales: `UPPER_SNAKE_CASE` (ej. `MAX_ITERATIONS`).
- **ESModules:** Fomentar el uso de sintaxis de importación moderna (`import / export`).

### 2.2 Funciones Limpias
- **Principio de Responsabilidad Única (SRP):** Cada función debe hacer **una sola cosa**. Si una función ocupa más de 50 líneas, debe ser evaluada para su división.
- **Evitar anidamientos profundos:** Usa retornos tempranos (*Early Returns*) para reducir la complejidad condicional.
  ```ts
  // ❌ Mal
  if (user) {
    if (user.isAdmin) {
      // lógica
    }
  }
  
  // ✅ Bien
  if (!user || !user.isAdmin) return;
  // lógica
  ```

---

## 🔒 3. Seguridad y Variables de Entorno

### 3.1 Cero Trust
- **Validación Estricta:** Las herramientas como `filesystem` o `shell_secure` deben parsear el input exhaustivamente y validarlo contra listas blancas antes de ejecutar la acción.
- **Credenciales:** Bajo ningún concepto subir claves privadas. Siempre utilizar `process.env` mediante un envolvedor como `src/config/index.ts` que centralice y garantice la existencia prioritaria de las variables durante la fase de *startup*.

---

## 📝 4. Documentación y Control de Versiones

### 4.1 Commit Messages
- **Regla Estricta:** Los mensajes de commit **siempre** deben escribirse en **Español**.
- Deben seguir el esquema **Conventional Commits**:
  - `feat: añade lógica de aprobación humana para scripts`
  - `fix: corrige validación de directorios permitidos en filesystem`
  - `docs: actualiza archivo README.md con nuevas variables`

### 4.2 Documentación Interna (infoDoc/)
- El directorio `infoDoc/Docs` (y `infoDoc/moockup_funcionalidad`) contiene documentos de alto valor para el desarrollo sobre contexto del proyecto. **No deben ignorarse nunca**, aunque figuren en el `.gitignore`. Forman parte íntegra del entendimiento del ecosistema general.

### 4.3 Comentarios en Código
- **El por qué, no el qué:** Escribe el código lo suficientemente expresivo para que sea auto-explicativo. Comenta únicamente para explicar *por qué* se ha tomado una decisión compleja o contraintuitiva (Ej. un *workaround* temporal).

---

## 🚀 5. Testing y Despliegue

### 5.1 Calidad de las Tools
Toda herramienta/Skill nueva generada manual o autónomamente debe:
1. Declarar su interfaz de `parameters` (JSON Schema) de forma inmaculada para el LLM.
2. Retornar siempre objetos serializables en JSON limpio que no confundan al motor de inferencia.

### 5.2 Tests Continuos por Iteración y la filosofía 100/80/0
- **Filosofía 100/80/0:** Tanto nosotros a la hora de codificar ChochiBot, como **ChochiBot al auto-generar su propio código**, debemos aspirar a cumplir estrictamente la regla del 100/80/0:
  - **100% de cobertura en Unit Tests**: Toda la lógica central (AgentLoop) y reglas de negocio puras deben estar cubiertas.
  - **80% de cobertura en Integration Tests**: Los adaptadores que tocan la BD, llm, o red deben integrarse cubriendo al menos la regla de Pareto (las rutas críticas).
  - **0% en E2E Tests (por defecto)**: Minimizar esfuerzos en UI test o end-to-end complejos si no aportan un inmenso valor sobre el costo de mantenimiento en este estado del proyecto.
- **Framework:** Usamos `vitest` por su velocidad y compatibilidad nativa con TypeScript y ESM. Todas las tools y la lógica deben someterse a prueba antes de avanzar.

### 5.3 CI/CD y Subida de Código (Veto de Commits)
- **Cero Tolerancia a Tests Rotos:** Bajo NINGÚN concepto se debe hacer commit o subir código (Push) si los tests están fallando. 
- En caso de que se añada una funcionalidad y los tests fallen, la iteración **no se completa** hasta que pasen. No se sube código roto.
- De esta manera el repositorio en la rama `main` siempre será 100% estable.

### 5.4 Despliegue y Reglas Finales
- **Entorno Limpio:** Ejecutar regularmente `npm run build` para asegurar que el compilador estricto (`tsc`) verifique toda ruta y mapeo de tipos en todo el proyecto.
- Si se añaden dependencias o tools, corroborar que el agente responde correctamente al ciclo devuelto (`npm run dev`) y que la batería de automatización pasa limpiamente (`npm run test`) antes de subir.

Siguiendo de cerca este manifiesto, ChochiBot crecerá manteniendo la agilidad del día cero durante toda su vida útil.
