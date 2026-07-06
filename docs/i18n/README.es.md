> 🌐 [English version](../../README.md)

**Autor**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Versión**: v5.6.9

---

## 🆕 Un núcleo más sólido (v5.12.0)

Durante una semana de acceso anticipado al nuevo modelo **Fable** de Anthropic, reconstruimos el corazón de AgentVibes en **un único núcleo compartido**. La lógica de voz / motor / enrutamiento / volumen / silencio que solía estar copiada en cuatro scripts (y divergía entre sí) ahora vive en un solo lugar — más simple, más consistente y más estable.

- **🔊 Las vistas previas se reproducen en el lugar correcto** — con SSH remoto configurado, las vistas previas de voz y de **música** se reproducen en tu receptor; de lo contrario se reproducen localmente.
- **🧠 Un único núcleo compartido** — el silencio de Kokoro en Linux y la divergencia por voz corregidos en el origen, con un respaldo seguro si es necesario.
- **🧹 Eliminada la pestaña Voces redundante** — elige una voz para cualquier proveedor en Setup.

### v5.11.0 — Voces neuronales

- **🧠 Kokoro** — TTS neuronal local en tu **CPU, sin GPU requerida** (chino, japonés y coreano integrados).
- **☁️ ElevenLabs** — voces neuronales premium en la nube.
- Efectos de audio combinables: apila **reverb**, **echo** y **chorus** en cualquier voz.

## v5.7.7 — Restauración de Voces en Modo Party + Mejoras

**Los agentes del modo party ahora hablan de nuevo:** BMAD `/party-mode` ahora invoca de forma confiable el skill correcto de AgentVibes, y cada respuesta del agente se lee en voz alta con su voz única con música, pretext y reverb por agente — cargados automáticamente desde `~/.agentvibes/bmad-voice-map.json`.

**Nueva pista incluida:** 🌌 CelestialVelvet añadida al catálogo de música integrado.

**Corrección de contraste TUI:** Las filas seleccionadas en las pestañas Voces y Agentes ya no muestran texto gris ilegible.

**SSH remoto:** Corregido el error "wait: pid is not a child of this shell" en `play-tts-ssh-remote.sh`.

## v5.7.6 — Integridad del Payload SSH Remoto + Reescritura del Receptor

**Arreglo de música/voz SSH remoto:** La pista de música y la voz correctas del proyecto ahora llegan al receptor remoto — anteriormente se usaba la configuración global en lugar de la configuración del proyecto activo.

**Reescritura del receptor Bash:** El `agentvibes-receiver.sh` de Linux/Termux ha sido completamente reescrito para decodificar el formato de payload base64 JSON actual. El antiguo formato de argumentos posicionales de pre-v5.5 ha desaparecido.

**Sin doble introducción:** El pretext de personalidad (ej., "Bcs latin dance here") ya no se escucha dos veces sobre SSH remoto. `play-tts.sh` lo antepone al texto; el receptor ya no recibe un campo de pretext separado para anteponer de nuevo.

**Host SSH visible en TUI:** Las pestañas de Configuración y Voces ahora muestran tu alias de host SSH remoto configurado.

**Correcciones de seguridad** y 24 nuevas pruebas BATS que cubren el viaje de ida y vuelta completo emisor → receptor.

## v5.7.5 — Contraste de Botones TUI + Correcciones de Enrutamiento BMAD

## v5.7.0 — Soporte para BMAD v6.6 + Reinicio Automático del Watcher en Windows

**BMAD v6.6.0:** AgentVibes ahora detecta la nueva estructura de agentes `.claude/skills/*/agents/`, gestiona correctamente BMAD instalado globalmente en `~/_bmad`, y omite graciosamente los agentes v6.6+ de Markdown simple durante la inyección de TTS en lugar de dar error. La pestaña BMAD ahora muestra la detección correctamente para instalaciones globales.

**Watcher de Windows:** `tts-watcher.ps1` es ahora un archivo independiente en `~/.agentvibes/tts-watcher.ps1`. Ejecutar `npx agentvibes update` ahora copia el watcher más reciente **y** lo reinicia automáticamente — tanto el archivo como el proceso se actualizan en un solo paso, sin reinicio manual.

**Proveedor de Windows:** `play-tts.ps1` ahora respeta el `ProviderOverride` de la configuración del servidor Linux al recibir audio remoto.

## v5.6.9 — Reverb y Música de Fondo Silenciosos en Instalaciones NPX

**Usuarios de WSL:** AgentVibes reproducía `en_US-lessac-medium` independientemente de la voz configurada. Corregido — ahora Piper se encuentra en shells no interactivos añadiendo explícitamente `~/.local/bin` al `PATH` antes de la comprobación del binario.

**Enrutamiento por proyecto:** El hook de inicio de sesión ahora incorpora `--project-dir` en cada comando TTS inyectado, de modo que tu voz y música configuradas se reproducen correctamente en las llamadas a la herramienta Bash incluso cuando `CLAUDE_PROJECT_DIR` no está en el entorno.

`play-tts-piper.sh` y `play-tts-piper.ps1` ahora están incluidos en el despliegue de hooks críticos de `agentvibes install` — las versiones actualizadas se propagan automáticamente.

## v5.6.7 — Vista Previa en Windows Corregida

El botón de Vista Previa en la configuración de audio del LLM ahora funciona correctamente en Windows.

## 🌟 NUEVO EN v5.6.6 — El Botón de Vista Previa Funciona en WSL + Suite de Pruebas Exhaustiva para Windows

**El botón de Vista Previa en la configuración de audio por LLM ahora funciona correctamente en WSL.** Al configurar una voz, reverberación y pista de fondo para cada LLM, hacer clic en Vista Previa reproduce tu configuración de audio completa — voz, música y efectos — exactamente como sonará durante una sesión real. Anteriormente, la música de fondo era descartada silenciosamente en configuraciones con `npm link` e instalación global.

Se ha añadido una **suite de pruebas exhaustiva para Windows** a CI, que se ejecuta junto a la suite BATS de Linux existente. Las rutas de audio específicas de Windows ahora se verifican en cada push — las regresiones ya no pueden colarse silenciosamente.

## v5.6.4 — Corrección Crítica de Seguridad en la Desinstalación

`uninstall --global` estaba eliminando todo tu directorio `~/.claude/` — ajustes, CLAUDE.md, skills, configuraciones MCP, todo. Corregido: AgentVibes ahora realiza una eliminación quirúrgica, tocando únicamente los archivos que él mismo creó. Una prueba de regresión en CI aplica esto de ahora en adelante — si alguna vez regresa el problema, la compilación falla antes de publicarse.

## v5.6.3 — Hermes + Configuración remota más sencilla

AgentVibes ahora habla por **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — el asistente de IA autohospedado y automejorado. Dos skills listas para producción se incluyen en `docs/hermes/skills/`:

- **`hermes-agentvibes-hook`** — Habla automáticamente cada respuesta de Hermes via AgentVibes TTS. Se activa en `agent:end`, elimina markdown, limita la tasa y cuenta con protección SSH completa contra MITM
- **`agentvibes-target`** — Enseña a Hermes a enviar cualquier texto a tus altavoces bajo demanda, con soporte para Windows y Android

También en esta versión: correcciones de compatibilidad PS5.1 para `play-tts.ps1`, reparaciones de modal/atajos de teclado y la pestaña BMAD ahora muestra todos los agentes.

## v5.5 — Enrutamiento de Audio por LLM

Dale a **cada LLM su propia voz, pretexto y música** — Claude Code, Copilot y Codex pueden sonar diferente sin tocar la configuración global.

- Añade filas `llm:<nombre>|...|voice|pretext|engine` a `audio-effects.cfg`
- El servidor MCP detecta automáticamente qué LLM está llamando y pasa `--llm <key>`
- Configura en **Setup → Default → Configure** en la TUI

También corregido: crash del instalador de Windows (`spinner.info is not a function`) en **reinstalación** con una instalación global de AgentVibes anterior.

---

**🎛️ NUEVO EN v5.4.0 — Instalador TUI y Correcciones:**
- 🖥️ **Instalador TUI** - Interfaz de terminal interactiva: explora voces, configura proveedores, activa el modo fiesta BMAD
- 🔧 **Corrección del Spinner** - Resuelto el fallo `spinner.info is not a function` en WSL/Linux
- 🐛 **Corrección de Dependencia Circular** - Eliminada la dependencia autorreferencial `agentvibes@^3.5.9` que rompía las instalaciones silenciosamente
- 🎵 **Corrección del Volumen de Música de Fondo** - Restaurado el fallback `bg_volume="0.20"` en `audio-processor.sh`
- 📂 **Corrección de PROJECT_ROOT** - `play-tts.sh` ahora resuelve correctamente la raíz del proyecto para la configuración por proyecto

## 🎯 NUEVO EN v5.3.0 — Toma el Control de las Voces Remotas

- **Personaliza cada anuncio remoto de forma individual** — pasa `--voice`, `--pretext`, `--music`, `--volume`, `--effects`, `--speed`, `--provider` en la línea de comandos solo para ese mensaje concreto. Se acabó editar archivos de configuración y tener que revertirlos después.
- **Omite la frase de introducción cuando quieras** — `--pretext ""` suprime el pretexto para un único mensaje.
- **Los mensajes largos y los caracteres especiales funcionan correctamente en Windows** — el texto con comillas, apóstrofos, emoji o contenido de varias líneas ya no se trunca de camino al motor de voz.
- **La reproducción de voz funciona en servidores Windows sin monitor** — un asistente en segundo plano corre en tu sesión de usuario y recoge los anuncios desde una cola, así que el audio se reproduce incluso cuando entras por SSH a una máquina sin cabeza.
- **La vista previa de voz en servidores remotos se emite al dispositivo correcto** — la vista previa de la TUI ya no cae de vuelta al audio local en máquinas sin altavoces.
- **Se acabaron las frases de introducción duplicadas** cuando tanto emisor como receptor tienen pretexto configurado.
- **55 nuevas pruebas** para la asignación de voz y el aislamiento de agentes en modo fiesta de BMAD.

## 🎯 v5.2.1 — Identidad Multi-LLM y Pulido de Instalación

- **Copilot obtiene su propia voz + pretexto + música** — "Copilot here" con bossa nova, totalmente distinto de Claude Code y Codex.
- **Configs MCP por herramienta con identidad explícita** — `.vscode/mcp.json`, `.codex/config.toml`, `~/.copilot/mcp-config.json` cada uno establece su propio `AGENTVIBES_LLM`.
- **La herramienta MCP `get_config` devuelve el LLM detectado** — los asistentes pueden confirmar su enrutamiento y responder con la voz correcta.
- **Navegación de Setup: Instalar → Instalar → Instalar → Configurar → Configurar → Configurar** — el flujo de teclado recorre las tres configuraciones antes de llegar a Por Defecto.
- **Música de fondo por defecto de Claude Code** configurada en Chillwave.
- **Refinamientos de compatibilidad con Linux** — CRLF, permisos, anulación del proveedor de transporte.

## 🎯 v5.2.0 — Vista Previa de Voz Remota + Modo Cavernícola + Valoraciones de Voz

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
