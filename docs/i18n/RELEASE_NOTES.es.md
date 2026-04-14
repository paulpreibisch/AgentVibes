> 🌐 [English version](../../RELEASE_NOTES.md)

## 🎯 v5.2.1 — Identidad Multi-LLM y Pulido de Instalación

**Fecha de lanzamiento:** Abril 2026

Enrutamiento LLM pulido para Copilot/Codex y experiencia de configuración refinada.

### ✨ Novedades

#### Enrutamiento de Identidad Multi-LLM

- **GitHub Copilot ahora tiene su propia voz, pretexto y música de fondo** — totalmente distinto de Claude Code y Codex. Saluda con "Copilot here" al ritmo de bossa nova.

- **Configs MCP por herramienta con identidad explícita** — cada herramienta de IA (`.vscode/mcp.json`, `.codex/config.toml`, `~/.copilot/mcp-config.json`) establece su propio `AGENTVIBES_LLM` para que el enrutamiento sea determinista.

- **La herramienta MCP `get_config` ahora devuelve el LLM detectado** — para que el asistente pueda confirmar su enrutamiento y responder con la voz correcta desde el principio.

- **Refinamientos de compatibilidad con Linux** — finales de línea CRLF, permisos y manejo de anulación del proveedor de transporte.

#### Mejoras del Flujo de Configuración

- **Flujo de navegación por teclado** — al presionar Enter en los botones de Instalar (Claude → Copilot → Codex), ahora salta a **Configurar Claude**, permitiéndote recorrer las tres opciones de Configurar antes de aterrizar en Por Defecto.

- **La flecha abajo omite la fila Por Defecto** desde las columnas Instalar/Eliminar.

- **Mensajes de éxito parcial de instalación** — si las copias de archivos tienen éxito pero el MCP config necesita un empujón, verás una advertencia clara en lugar de un fallo genérico.

#### Valores Predeterminados

- **Música de fondo por defecto de Claude Code** configurada en Chillwave (`agent_vibes_chillwave_v2_loop.mp3`).

#### Internamente

- Validación de clave LLM endurecida para un manejo más seguro de variables de entorno.
- Registro de errores mejorado para casos límite en escrituras de configuración de Copilot CLI.
- Limitación conocida documentada: si lanzas VS Code desde una terminal iniciada por Claude Code, `CLAUDECODE=1` puede filtrarse — la solución es hacer `unset CLAUDECODE` primero.

---

## 🎯 v5.2.0 — Vista Previa de Voz Remota + Modo Cavernícola + Valoraciones de Voz

**Fecha de lanzamiento:** Abril 2026

Esta versión añade soporte de vista previa TTS remota, un nuevo nivel de verbosidad ultra-conciso y valoraciones de pulgar arriba/abajo para voces en toda la TUI.

### Nuevas Funciones

- **Modo de verbosidad cavernícola** — Nuevo nivel de verbosidad `caveman` para salida TTS ultra-concisa. Fragmentos en lugar de frases. Se configura mediante `/agent-vibes:verbosity caveman` o la herramienta MCP `set_verbosity`. Descarga automáticamente una voz en una instalación nueva si no hay ninguna presente.

- **Valoraciones de pulgar arriba/abajo para voces** — Sustituye los antiguos favoritos con estrellas por valoraciones 👍/👎. Pulsa `+` para pulgar arriba, `-` para pulgar abajo tanto en la pestaña Voces como en el selector de voz (pestaña Configuración). Las valoraciones persisten entre sesiones y se comparten entre todas las interfaces de selección de voz.

- **Vista previa de voz remota** — La vista previa de voz en la pestaña Voces de la TUI, el selector de voz y el navegador de voces ahora funciona en servidores sin cabeza. Cuando el proveedor activo es `ssh-remote` o `agentvibes-receiver`, la vista previa se enruta a través de `play-tts.sh` para reproducir audio en el receptor remoto en lugar de requerir Piper + reproductor de audio local. Consciente de la plataforma: usa PowerShell en Windows, bash en Linux.

- **Enrutamiento del proveedor receptor SSH** — `ssh-remote` y `agentvibes-receiver` son ahora proveedores de primera clase en `play-tts.sh`. Tanto la función `speak_text()` como la sentencia case de enrutamiento principal los soportan, eliminando los errores "Unknown provider".

### Correcciones

- **Parcheo automático de nombres de hablantes LibriTTS** — La descarga de voces ahora parchea automáticamente los nombres de hablantes de LibriTTS para que las voces multi-hablante funcionen correctamente desde el primer momento.
- **Expresión regular de validación de voces reforzada** — La expresión regular del parámetro VOICE ahora permite `::` (multi-hablante), `.` (locale) y espacios (nombres de hablantes) sin aceptar barras invertidas (riesgo de inyección). Las plantillas de receptor de Linux y Windows actualizadas para coincidir.
- **Compatibilidad multiplataforma de `base64`** — Detecta GNU `base64 -w 0`, recurre a BSD `-b 0`, luego a `tr -d '\n'`. Corrige el aborto del script en sistemas macOS/BSD.
- **Corrección del doble procesado de efectos de audio** — `play-tts-piper.ps1` omite su propia llamada al procesador de audio cuando `AGENTVIBES_NO_PLAY` está establecido.
- **Corrección de fuga del código de salida** — `play-tts.ps1` ahora sale explícitamente con código 0.
- **Soporte de plataforma Windows en la pestaña del receptor** — La detección de IP de Tailscale, la IP local mediante PowerShell, la lectura de sshd_config y la copia al portapapeles funcionan de forma nativa en Windows.
- **Fila de efectos de audio `llm:default`** — Una nueva fila predeterminada garantiza que los receptores remotos obtengan reverberación, música y pretexto.
- **Texto de muestra de vista previa** — Cambiado para evitar un defecto de pronunciación de Piper.
