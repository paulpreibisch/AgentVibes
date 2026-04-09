> 🌐 [English version](../../README.md)

**Autor**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Versión**: v5.0.0

---

## 🚀 NUEVO EN v5.0.0 — Soporte Multi-Proveedor: Claude Code + Copilot + Codex

- **GitHub Copilot + OpenAI Codex en VS Code** — AgentVibes ahora soporta los tres principales asistentes de codificación con IA. Instala y configura cada uno desde la TUI.
- **Una sola pestaña de Configuración** — asistente de 4 pasos (Idioma → Dependencias → Motor TTS → Proveedores) reemplaza las antiguas pestañas de instalador + LLM. Los usuarios existentes saltan directamente a Proveedores.
- **Configuración de audio por proveedor** — cada LLM tiene su propia Voz, Motor TTS, Reverb, Música y Pretexto a través del modal Configurar.
- **Configuración rediseñada** — lista plana y limpia: Idioma, Motor TTS, Voz, Nivel de Detalle, Destino de Audio, Almacenamiento de Configuración, Re-ejecutar Asistente.
- **Selector de voz mejorado** — visualización en 3 columnas, previsualización con barra espaciadora, el desplazamiento se mantiene en su lugar.

---

## 🎙️ v4.6.7 — Correcciones de TTS en Modo Fiesta

- **Los pretextos de agentes ahora se hablan en modo fiesta** — "John, Product Manager here" se descartaba silenciosamente por un error de sincronización en la pre-síntesis. Corregido.
- **No más asteriscos hablados** — el markdown se elimina antes del TTS en modo fiesta
- **TTS de inicio de sesión en Windows corregido** — el hook ahora emite JSON correcto para que el TTS se active de forma fiable al iniciar sesión
- **El hook PreToolUse ya no da error** en comandos grep/regex

---

## 🧭 v4.6.6 — Navegación Natural en TUI

La TUI de Configuración ahora fluye como esperarías. Abajo se mueve de arriba a abajo por encabezado → sub-pestañas → contenido → pie de página. Izquierda/Derecha cambia sub-pestañas y se mueve entre botones del pie de página. Arriba desde el contenido regresa a la sub-pestaña activa — no siempre a Voz. La pestaña de Idioma tiene una lista desplazable adecuada. El Readme recurre al README del paquete AgentVibes cuando no existe uno local. Escape desde el instalador ya no se queda atascado.

---

## 🌟 v4.5 — Lanzamiento "Habla Todos los Idiomas"

### 🌍 TUI Multilingüe — 9 Idiomas

Cada pantalla, botón y etiqueta en `npx agentvibes` está ahora completamente traducido:

- **Inglés, Español, Francés, Alemán, Portugués, Japonés, Coreano, Chino (Simplificado), Italiano**
- Selección de idioma en el primer lanzamiento — elige tu idioma antes que nada
- Subpestaña de idioma en Configuración — cambia en vivo, sin necesidad de reiniciar
- Todas las etiquetas de pestañas, botones, sugerencias de pie de página, mensajes de estado y pestañas BMAD/Receiver traducidas
- Archivos i18n por idioma (`src/i18n/en.js`, `es.js`, `fr.js`, ...) con respaldo en inglés

### 🪟 Endurecimiento de Seguridad en Windows

- **Archivos temporales impredecibles** — `randomUUID()` reemplaza a `Date.now()` en todos los nombres de archivos temporales (JS + PowerShell)
- **Sin inyección de shell** — `spawnSync` reemplaza a `execSync(..., { shell: true })` para búsquedas `which`
- **Detección inteligente de reproductor de música** — `detectMp3Player()` reemplaza al `ffplay` hardcodeado en Windows
- **Corrección de booleano** — `isWindowsTerminal` ahora devuelve `true/false`, no la cadena UUID de `WT_SESSION`

### 🎙️ BMAD Speak Multiplataforma

- `bmad-speak.js` — punto de entrada multiplataforma; enruta automáticamente a PowerShell en Windows o bash en Mac/Linux
- `bmad-speak.ps1` — BMAD speak nativo de Windows con enrutamiento de personalidad por agente

### 🧪 600 Pruebas, Cero Fallos
