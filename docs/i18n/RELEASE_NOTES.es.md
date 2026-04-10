> 🌐 [English version](../../RELEASE_NOTES.md)

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
