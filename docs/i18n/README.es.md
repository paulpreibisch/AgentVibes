> 🌐 [English version](../../README.md)

**Autor**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Versión**: v5.2.0

---

## 🎯 NUEVO EN v5.2.0 — Vista Previa de Voz Remota + Modo Cavernícola + Valoraciones de Voz

- **Modo de verbosidad cavernícola** — Fragmentos TTS ultra-concisos. Configura con `/agent-vibes:verbosity caveman`.
- **👍/👎 valoraciones de voz** — Pulsa `+` para pulgar arriba, `-` para pulgar abajo en cualquier lista de voces. Sustituye los favoritos con estrellas.
- **Vista previa de voz remota** — La vista previa de voz en la TUI funciona en servidores sin cabeza mediante receptor SSH. No se necesita audio local.
- **Enrutamiento del receptor SSH** — `ssh-remote` y `agentvibes-receiver` son ahora proveedores de primera clase.
- **Validación de voces reforzada** — Formato multi-hablante `::`, base64 multiplataforma, sin inyección de barra invertida.

---

## 🛡️ v5.1.4 — Renovación de Resiliencia TTS + Proveedor LLM por Defecto

- **Proveedor LLM por Defecto** — Nueva entrada de reserva al final de Configuración → Proveedores. Solo configurable; abre el modal Configurar estándar. Se usa cuando una herramienta llama a TTS sin identificar su LLM.
- **Música de fondo por LLM se activa automáticamente** — Configurar una pista de fondo en el modal Configurar ahora la reproduce realmente (ya no hace falta activar además la música global).
- **Soporte para Copilot CLI** — `installCopilotMcp` ahora escribe tanto `.vscode/mcp.json` (Copilot Chat) como `~/.copilot/mcp-config.json` (Copilot CLI — producto distinto, ruta de configuración distinta).
- **Arquitectura de enrutamiento por cliente** — `.mcp.json` ya no establece `AGENTVIBES_LLM`. Claude Code se detecta automáticamente vía la variable `CLAUDECODE=1`. Copilot CLI lee su propia configuración global. Sin más conflictos de configuración entre clientes.
- **Mutex TTS auto-reparable** — Cuando un proceso `play-tts.ps1` bloqueado detiene la cola de reproducción, el siguiente intento lo mata automáticamente (no hace falta `taskkill` manual). Watchdog de 25 segundos garantiza el progreso.
- **Se acabó la reproducción de audio rancio** — `play-tts.ps1` captura el nombre de archivo exacto desde el stdout del proveedor en lugar de adivinar "el `tts-*.wav` más reciente". Se acabó la reproducción silenciosa de audio antiguo.
- **La voz por LLM gana sobre `VoiceOverride` explícito** — Los LLMs devuelven los resultados de `get_config` en cada llamada, lo que estaba sobrescribiendo el enrutamiento por LLM. Corregido.
- **`lessac-medium` → `lessac-high`** por defecto para codex — Solución al fallo silencioso de síntesis.
- **Renombrado de archivos scratch + codificación ASCII** — Elimina archivos de audio compuestos acumulados y errores de parseo CP1252 en Windows.
- **Confirmación de Configuración → Instalar** ahora avanza el foco a la siguiente fila de proveedor (flujo Instalar → Instalar → Instalar).

---

## 🎙️ v5.1.0 — Renovación del Selector de Voz + Guardado Automático en el Modal de Agente

- **Guardado automático en el modal de agente** — Los cambios de voz/personalidad/música/reverb/pretexto se guardan automáticamente mientras los editas. Un breve aviso "✓ ¡Guardado!" confirma cada cambio.
- **Nombres únicos para LibriTTS** — 904 hablantes obtienen apellidos deterministas: **Anna Bell**, **Anna Carter**, …, **Anna Quinn**. Se acabaron los duplicados "Anna-2", "Anna-3".
- **Símbolos de género rosa ♀ / azul ♂** — Indicadores de género en color en la pestaña Voces y en todos los modales del selector de voz.
- **Salto rápido por letra inicial** — Pulsa `a`–`z` en cualquier selector de voz para saltar a esa letra. `q`, `j`, `k`, `g`, `h`, `l` se reservan para navegación/cancelar.
- **PgUp / PgDn / Home / End** en selectores de voz
- **3 nuevas pistas de música de fondo** — Late Night Hip Hop Groove, Drifting Down the Hall, Midnight Charleston Stomp
- **Barra de búsqueda eliminada de los selectores de voz** — reemplazada por salto por letra inicial (más rápido, sin problemas de foco)
- **Corrección de corrupción en la pestaña Voces** — las filas no instaladas ya no pierden su columna de Proveedor al navegar sobre ellas
- **Artefactos de parpadeo eliminados en las pestañas Música + Voces**

---

## 🚀 v5.0.0 — Soporte Multi-Proveedor: Claude Code + Copilot + Codex

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
