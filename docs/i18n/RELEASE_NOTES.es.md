> 🌐 [English version](../../RELEASE_NOTES.md)

## 🛡️ v5.1.4 — Renovación de Resiliencia TTS + Proveedor LLM por Defecto + Enrutamiento por Cliente

**Fecha de lanzamiento:** Abril 2026

Esta versión cierra un largo grupo de errores alrededor del enrutamiento TTS por LLM, reproducción de audio paralelo, bloqueos por procesos atascados y reproducción de audio rancio. También añade una nueva entrada de "Por Defecto" en la pestaña de Configuración para audio de reserva, y cambia a un esquema de configuración por cliente que enruta correctamente Claude Code, GitHub Copilot (Chat + CLI) y OpenAI Codex a sus propias voces y pretextos.

### Nuevas Funciones

- **Proveedor LLM por Defecto** — Nueva entrada al final de Configuración → Proveedores. Solo configurable (sin botones de instalar/eliminar) con un botón Configurar que abre el modal estándar por LLM. Cuando cualquier herramienta llama a TTS sin identificar su LLM, la fila `llm:default` en `audio-effects.cfg` proporciona la voz, pretexto, música, reverberación y motor de reserva. Pretexto vacío por defecto — los usuarios optan por configurarlo.

- **La música de fondo por LLM se activa automáticamente** — Configurar un `bg_track` en cualquier modal Configurar por LLM ahora reproduce realmente esa pista. Antes también tenías que activar el indicador global `backgroundMusic.enabled`, lo que hacía que el campo de pista de fondo por LLM fuera silenciosamente inoperante.

- **Soporte para Copilot CLI** — `installCopilotMcp` ahora escribe TANTO `.vscode/mcp.json` (para VS Code Copilot Chat) COMO `~/.copilot/mcp-config.json` (para el CLI independiente `copilot`, que es un producto diferente). Las instalaciones nuevas soportan ambas herramientas automáticamente.

### Arquitectura de Enrutamiento por Cliente

Anteriormente `AGENTVIBES_LLM=claude-code` se establecía en `.mcp.json`, lo que rompía Copilot CLI porque Copilot CLI también lee `.mcp.json` con precedencia sobre su propio `~/.copilot/mcp-config.json` — por lo que adoptaba el entorno de Claude Code y se enrutaba mal.

La nueva arquitectura divide la identificación por LLM por cliente:

- `.mcp.json` (proyecto) **no tiene bloque `AGENTVIBES_LLM`**
- `~/.copilot/mcp-config.json` establece `AGENTVIBES_LLM=copilot` para GitHub Copilot CLI
- `~/.codex/config.toml` establece `AGENTVIBES_LLM=codex` para OpenAI Codex
- El servidor MCP (`mcp-server/server.py`) **detecta automáticamente Claude Code** vía la variable `CLAUDECODE=1` que Claude Code establece en cada subproceso que genera. Copilot CLI y Codex no establecen esta variable, por lo que cada cliente se enruta de forma fiable a su propia configuración.

Ruta de actualización: vuelve a ejecutar el instalador de AgentVibes en cualquier proyecto existente. El nuevo `installClaudeMcp` elimina automáticamente cualquier bloque de entorno `AGENTVIBES_LLM` rancio de los archivos `.mcp.json` existentes para que Copilot CLI deje de enrutarse mal.

### Renovación de Resiliencia TTS (`play-tts.ps1`)

- **Mutex de reproducción entre procesos** — `AgentVibesPlaybackLock` (mutex con nombre) serializa la reproducción entre todos los llamadores: hooks de Claude Code, `text_to_speech` de MCP, CLI directo, modo party. Se acabaron las superposiciones o el audio paralelo cuando varios LLMs se ejecutan en el mismo proyecto.

- **Auto-reparación en timeout del mutex** — Cuando la adquisición del mutex de 15 segundos falla, el nuevo código consulta `Win32_Process` buscando cualquier proceso `play-tts.ps1` atascado con más de 20 segundos, llama a `Stop-Process -Force` en cada uno y registra el kill en stderr. La siguiente llamada TTS tiene éxito inmediatamente — no hace falta `taskkill` manual.

- **Watchdog de script de 25 segundos** — Un trabajo hermano de PowerShell mata forzosamente `play-tts.ps1` después de 25 segundos sin importar dónde esté atascado (deadlock de SoundPlayer, dispositivo de audio bloqueado, ffmpeg zombie). Garantiza el progreso.

- **Error duro en timeout del mutex** — Sustituye el antiguo fallback "reproducir de todos modos" que solo apilaba más procesos atascados detrás del primero. Ahora sale limpiamente con código 2 y un mensaje diagnóstico.

- **Captura del nombre de archivo exacto desde stdout del proveedor** — `play-tts.ps1` analiza la línea `[OK] Saved to: <ruta>` de `play-tts-piper.ps1` y usa ese archivo exacto. Sustituye la antigua heurística "seleccionar el `tts-*.wav` más reciente en el directorio de audio" que reproducía silenciosamente audio rancio de sesiones anteriores cuando la síntesis fallaba. Causa raíz del error "Codex habla con el audio de Claude Code".

- **Error duro en fallo de síntesis** — Cuando el proveedor no produce un archivo de salida, `play-tts.ps1` sale con código 3 y un error fuerte en lugar de recurrir a cualquier archivo antiguo en la caché.

- **Renombrado de archivos scratch** — Post-procesamiento de reverberación ahora escribe en `av-reverbed-scratch.wav` y el mezclado en `av-mixed-scratch.wav`. Nombres fijos fuera del espacio de nombres aleatorio `tts-XXXXXXXX` para que la búsqueda de archivos nunca pueda elegirlos como entrada de síntesis.

- **La voz por LLM anula `VoiceOverride` explícito** — Los LLMs llaman a `get_config` al inicio de la sesión y devuelven la voz en cada llamada `text_to_speech` como parámetro MCP explícito. Con la antigua prioridad "explícito gana", esa voz global anulaba el enrutamiento por LLM. Ahora la fila de voz `llm:<clave>` siempre gana cuando `-llm` está establecido.

- **`$LlmBgTrack` y `$LlmBgVolume` ahora se analizan** desde los campos 2 y 3 de la fila `llm:<clave>` (la versión bash ya lo hacía).

- **Codificación solo ASCII** — Eliminado em-dash `—` y flecha derecha `→` de `play-tts.ps1`. PowerShell en algunas configuraciones regionales de Windows carga scripts en CP1252 y se atragantaba con los bytes UTF-8.

- **`lessac-medium` → `lessac-high` por defecto para codex** — `en_US-lessac-medium` falla silenciosamente al sintetizar en algunas instalaciones de Piper en Windows. `lessac-high` funciona de forma fiable.

### Mejoras de UX

- **Confirmación de Configuración → Instalar** — Al pulsar Enter para descartar la página de confirmación post-instalación, el foco ahora avanza al botón de la misma columna de la SIGUIENTE fila del proveedor (Instalar → Instalar, Configurar → Configurar). Instalar los tres proveedores es ahora un flujo natural Enter-Enter-Enter.

### Pruebas y Robustez

- **30 pruebas de regresión nuevas/actualizadas** cubriendo forma del config del proveedor por defecto, auto-detección de `CLAUDECODE`, plantilla `.mcp.json` sin `AGENTVIBES_LLM`, escritor de `~/.copilot/mcp-config.json`, y análisis PowerShell de `play-tts.ps1`.

### Cómo Actualizar

```
npm cache clean --force
npx --yes agentvibes@5.1.4
```

Si tienes algún proyecto existente con AgentVibes instalado, vuelve a ejecutar el instalador una vez allí para que la migración del config por cliente surta efecto.

---

## 🎙️ v5.1.0 — Renovación del Selector de Voz + Guardado Automático en el Modal de Agente

**Fecha de lanzamiento:** Abril 2026

### Nuevas Funcionalidades

- **Guardado automático en el modal de edición de agente** — Los cambios por agente de voz/personalidad/música/reverb/pretexto ahora se guardan automáticamente mientras los editas. El botón Guardar explícito ya no existe; un breve aviso "✓ ¡Guardado!" confirma cada cambio. Cancelar y Restablecer Predeterminados siguen funcionando igual.

- **Nombres únicos para hablantes de LibriTTS** — Los 904 hablantes de LibriTTS ya no se muestran como "Anna", "Anna-2", "Anna-3", … "Anna-16". Cada uno obtiene un apellido determinista de un conjunto de 16 nombres: **Anna Bell**, **Anna Carter**, **Anna Davis**, …, **Anna Quinn**. Los ID de voz subyacentes no cambian, por lo que las configuraciones de usuario existentes siguen resolviéndose.

- **Símbolos de género rosa/azul** — Las voces femeninas muestran **♀** en rosa (magenta), las masculinas muestran **♂** en azul claro (bright-cyan), desconocido muestra `—`. La columna `Gender` del encabezado se reemplaza por `♀/♂` coloreado (de 10 a 4 caracteres de ancho), dando espacio a nombres más largos. Aplicado a la pestaña principal de Voces Y a los 3 modales del selector de voz (Configuración, Agentes, Ajustes).

- **Salto rápido por letra inicial en selectores de voz** — Pulsa cualquier letra `a`–`z` para saltar a la primera voz que empiece por esa letra. Las teclas reservadas (`q`, `j`, `k`, `g`, `h`, `l`) están bloqueadas para mantener su significado de cancelar / navegación vi.

- **Navegación por páginas en selectores de voz** — `PgUp`, `PgDn`, `Home`, `End` ahora funcionan en todos los modales del selector de voz.

- **3 nuevas pistas de música de fondo** — `Late Night Hip Hop Groove`, `Drifting Down the Hall` (ambiente años 90) y `Midnight Charleston Stomp` (swing). El conteo de pistas pasa de 15 a 18.

### Mejoras

- **Barra de búsqueda del selector de voz eliminada** — Reemplazada por el salto por letra inicial. El antiguo cuadro de búsqueda tenía problemas de foco que se tragaban las teclas de navegación. El salto es más rápido para el caso típico "buscar voz X".

- **Orden de la lista de pistas corregido** — Las pistas con prefijos emoji (p. ej. `🎤 Late Night Hip Hop Groove`) ahora se ordenan por la parte alfabética del nombre, no por el código del emoji. El orden es consistente entre versiones de Node/ICU.

- **Tecla de favoritos ahora es solo `*`** — Eliminado el enlace duplicado `f` para marcar favoritos en selectores de voz y en la pestaña principal de Voces. `f` queda libre para el salto por letra inicial (p. ej. saltar a Frank o Felix). El marcador `*` sigue siendo la forma canónica de alternar favoritos.

### Correcciones de Errores

- **Las filas no instaladas de la pestaña Voces ya no se corrompen** — Seleccionar una voz no instalada borraba visualmente su columna Proveedor debido a una expresión regular que coincidía demasiado con el envoltorio `bright-black-fg` de la fila. Reemplazada por un anclaje de sugerencia preciso que solo elimina el texto exacto de la sugerencia.

- **Artefactos de parpadeo eliminados en pestañas Música + Voces** — Los cursores `█` ya no dejan bloques residuales al desplazarse rápidamente por la lista. Ambas pestañas usan ahora un ayudante preciso para eliminar el parpadeo en lugar del frágil cortador basado en posición.

- **La pestaña Configuración ya no falla silenciosamente** — `_renderScreen3` envolvía todo el bloque de escritura de `setupCompleted` en un único `try/catch {}` vacío. Los archivos de configuración locales corruptos ahora se respaldan a `config.json.bak` y se reescriben desde cero, con errores registrados en stderr — no más "atascado repitiendo la configuración" sin explicación.

- **La cancelación `q` del selector de voz ahora funciona** — El nuevo salto por letra inicial se tragaba `q` (y otras teclas de navegación vi). Se agregó una lista de bloqueo de teclas reservadas.

- **Ordenación insensible a mayúsculas del selector de pistas** — Las pistas nuevas con nombres en Title Case (`Late Night Hip Hop Groove.mp3`) ya no saltan al principio de la lista por encima de las pistas en minúsculas `agent_vibes_*`.

### Impacto al Usuario

- Editar la voz o los ajustes de un agente ahora es más rápido — no hace falta recordar pulsar Guardar
- El selector de voz está mucho menos saturado con los 904 hablantes de LibriTTS teniendo todos nombres únicos y amigables
- Género de un vistazo mediante símbolos de color
- Tres nuevas pistas musicales para variar
- Artefactos de parpadeo/desplazamiento eliminados en las pestañas Voces y Música

---

## 🚀 v5.0.0 — Soporte Multi-Proveedor: Claude Code + Copilot + Codex

**Fecha de lanzamiento:** Abril 2026

### Nuevas Funcionalidades

- **Soporte para GitHub Copilot en VS Code** — Instala y configura AgentVibes para GitHub Copilot directamente desde la TUI. Crea `.vscode/mcp.json` y `.github/copilot-instructions.md`.

- **Soporte para OpenAI Codex en VS Code** — Integración completa con Codex incluyendo `.codex/config.toml`, protocolo TTS en `AGENTS.md` y hooks de inicialización.

- **Pestaña de Configuración Unificada** — El antiguo asistente de instalación de 5 pantallas y la pestaña separada de Proveedores LLM se fusionan en una única pestaña de Configuración. La primera ejecución muestra un asistente de 4 pasos (Idioma → Dependencias → Motor TTS → Proveedores); los usuarios recurrentes saltan directamente a la pantalla de Proveedores.

- **Configuración de Audio por Proveedor** — Cada proveedor LLM (Claude Code, Copilot, Codex) obtiene su propio Motor TTS, Voz, Reverberación, Música de Fondo y Pretext mediante un modal de Configuración.

- **Pantalla de Selección de Motor TTS** — Un nuevo paso del asistente muestra una lista de motores adaptada al sistema operativo (Piper, Soprano, Windows SAPI, macOS Say) con botones de Instalar para los motores faltantes.

- **Pestaña de Ajustes Rediseñada** — Se reemplazó el diseño de 5 sub-pestañas con una lista plana y limpia: Idioma de Interfaz, Motor TTS Predeterminado, Voz Predeterminada, Verbosidad, Destino de Audio, Almacenamiento de Configuración y Re-ejecutar Asistente de Configuración.

### Mejoras

- **Selector de voz mejorado en todas partes** — Visualización en 3 columnas (Nombre, Género, Proveedor), vista previa con barra espaciadora mediante síntesis y reproducción, posición de desplazamiento preservada durante la vista previa.

- **Artefactos de texto de ayuda corregidos** — Moverse entre filas en las pestañas de Agentes y Música ya no deja texto fantasma en las filas anteriores.

- **Enrutamiento de voz de Codex corregido** — `AGENTS.md` ahora indica a Codex que use `play-tts` para el habla normal y `bmad-speak` solo durante el modo fiesta BMAD.

### Impacto para el Usuario

- AgentVibes ahora funciona con Claude Code, GitHub Copilot Y OpenAI Codex
- Experiencia de configuración optimizada — una sola pestaña para toda la gestión de proveedores
- Personalización de voz por proveedor sin editar archivos de configuración
- La página de ajustes es drásticamente más simple y rápida de navegar

---

## 🐛 v4.6.8 — Corrección de Fallo en Instalación Limpia

**Fecha de lanzamiento:** Abril 2026

### Corrección de Errores

- **La pestaña de Configuración ya no falla en una instalación limpia** — `parseMultiSpeaker()` llamaba a `.includes()` sobre un voice ID nulo cuando no se había configurado ninguna voz todavía. Se añadió una protección contra nulos que devuelve un objeto predeterminado seguro. Reportado por un usuario que experimentó este fallo inmediatamente después de completar el asistente de instalación.

- **Enlace simbólico de macOS /var en prueba de reproducción** — Se corrigió una aserción de prueba que fallaba en macOS donde `/var` es un enlace simbólico a `/private/var`, causando que las comparaciones de rutas de reproducción fallaran.

- **Análisis de pretext en BMAD voices** — Las líneas de pretext en `bmad-voices.md` ahora se analizan correctamente y el markdown se elimina más exhaustivamente antes de la síntesis TTS.

### Impacto para el Usuario

- Los usuarios nuevos ya no experimentan un fallo al navegar a Configuración después de una instalación limpia
- La suite de pruebas funciona correctamente en macOS

---

## 🌍 v4.5.0 — Lanzamiento "Habla Todos los Idiomas"

**Fecha de lanzamiento:** Abril 2026

Soporte TUI multilingüe completo en los 9 idiomas, endurecimiento completo de seguridad de Windows y cero pruebas fallidas.

### 🌍 TUI Multilingüe — 9 Idiomas

Cada pantalla, pestaña, botón y etiqueta en la TUI de `npx agentvibes` está ahora completamente traducida:

- **Inglés, Español, Francés, Alemán, Portugués, Japonés, Coreano, Chino (Simplificado), Italiano**
- Selección de idioma en el primer lanzamiento (Pantalla 0 del asistente de instalación)
- Sub-pestaña de idioma en Configuración — cambia el idioma en vivo sin reiniciar
- Todas las etiquetas de la barra de pestañas, texto de botones, sugerencias de pie de página y mensajes de estado traducidos
- Pestaña BMAD y pestaña SSH Receiver completamente localizadas
- Archivos i18n por idioma con respaldo en inglés

### 🪟 Seguridad y Correcciones de Errores en Windows

- **Nombres de archivos temporales** — Todos los nombres de archivos temporales con `Date.now()` reemplazados por `randomUUID()` (impredecible, previene el secuestro de archivos temporales)
- **Inyección de shell** — `execSync('which ...', { shell: true })` reemplazado por `spawnSync`
- **Reproductor de música** — `ffplay` codificado en Windows reemplazado por `detectMp3Player()`
- **Coerción booleana** — `isWindowsTerminal` devuelve correctamente `true/false` en lugar de filtrar la cadena UUID de `WT_SESSION`

### 🎙️ BMAD Speak Multiplataforma

- `bin/bmad-speak.js` — punto de entrada multiplataforma para el habla de agentes BMAD
- `.claude/hooks-windows/bmad-speak.ps1` — BMAD speak nativo de Windows con enrutamiento de personalidad por agente

### 🧪 Suite de Pruebas

- 600 pruebas, 0 fallos

---

## 🐛 v4.5.1 — Lanzamiento de Parche

**Fecha de lanzamiento:** Abril 2026

### Corrección de Error

- **Vista previa de la pestaña Música** — Presionar Espacio en una pista en la pestaña Música ahora reproduce correctamente
  al ejecutar `npx agentvibes` desde un directorio nuevo. Anteriormente, si `.claude/audio/tracks/`
  no existía en el directorio de trabajo actual, la lista de pistas mostraba las pistas integradas pero
  Espacio no hacía nada (el reproductor se iniciaba contra una ruta inexistente). Ahora recurre
  automáticamente al directorio de pistas incluido en el paquete.
