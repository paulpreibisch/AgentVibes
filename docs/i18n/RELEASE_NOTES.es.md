> 🌐 [English version](../../RELEASE_NOTES.md)

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
