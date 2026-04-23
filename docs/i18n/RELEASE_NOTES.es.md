> 🌐 [English version](../../RELEASE_NOTES.md)

## 🎛️ v5.4.0 — Instalador TUI, Corrección del Spinner y Limpieza de Dependencias

**Lanzamiento:** 2026-04-22

### ✨ Novedades
- **Instalador TUI**: Interfaz de terminal interactiva para instalación guiada — explora voces, configura proveedores, activa el modo fiesta BMAD, todo desde una hermosa interfaz de terminal
- **Corrección del Spinner Multiplataforma**: Resuelto el fallo `spinner.info is not a function` en WSL/Linux que bloqueaba la instalación

### 🐛 Correcciones de Errores
- **Eliminada dependencia circular propia**: `package.json` dependía de `agentvibes@^3.5.9` (de sí mismo), haciendo que npm ocultara el binario corregido con el antiguo con errores — la causa silenciosa del fallo del spinner en instalaciones repetidas
- **Restaurado el fallback de volumen de música de fondo**: El fallback `bg_volume="0.20"` de `audio-processor.sh` perdido en una fusión fue restaurado
- **Corregida la detección de PROJECT_ROOT en `play-tts.sh`**: La lógica de subida de directorios iba 2 niveles de más, haciendo que TTS usara la configuración global `~/.agentvibes` en lugar de la del proyecto

### 🔧 Técnico
- 706/738 pruebas pasando

---

## 🎯 v5.3.0 — Toma el Control de las Voces Remotas

**Fecha de lanzamiento:** Abril 2026

Si usas AgentVibes para enviar anuncios de voz desde un servidor a tu
teléfono, portátil u otra máquina, esta versión te pone al volante.
Cada llamada puede ahora elegir su propia voz, música de fondo, frase
de introducción, reverb, volumen y velocidad — directamente desde la
línea de comandos, solo para ese mensaje.

### ✨ Novedades

#### Ahora puedes personalizar cada anuncio de forma individual

Antes, si querías una voz o música distinta para un mensaje concreto,
tenías que editar un archivo de configuración (y acordarte de revertirlo
después). Ahora solo tienes que añadir un flag al comando.

¿Quieres que Winston hable con su acento británico con jazz de fondo
para esta notificación concreta de despliegue? Fácil:

```bash
bash .claude/hooks/play-tts-ssh-remote.sh \
  --text "Deploy complete" \
  --voice "en_US-ryan-high" \
  --pretext "Winston here" \
  --music "Late Night Hip Hop Groove.mp3" \
  --volume 0.25
```

Todo lo que no especifiques recurre a tus ajustes normales. ¿Quieres
saltarte la frase de introducción solo esta vez? Pasa `--pretext ""` y
se quedará en silencio antes del mensaje.

**Flags disponibles:**
- `--voice` — qué voz de Piper usar
- `--pretext` — la frase de introducción antes del mensaje (pasa `""` para omitirla)
- `--music` — pista de música de fondo (¡los nombres de archivo con espacios ahora funcionan!)
- `--volume` — cómo de alta es la música de fondo (0.0 a 1.0)
- `--effects` — cadena de efectos de sonido, como reverb
- `--speed` — cómo de rápido habla la voz
- `--provider` — qué motor TTS usar
- `--agent` — qué personalidad de agente usar

La forma antigua de llamar al script sigue funcionando, así que nada de
lo que ya tengas configurado se romperá.

### 🛠 Correcciones de Fiabilidad

- **Los mensajes largos y los caracteres especiales ya no se cortan.**
  En Windows, los anuncios largos o el texto con comillas, apóstrofos o
  emoji se estaban mutilando antes de llegar al motor de voz.
  Corregido — tu mensaje llega ahora exactamente como lo enviaste, sin
  importar lo largo o raro que sea.

- **Los anuncios de voz ahora funcionan en servidores Windows sin
  monitor.** Windows se niega a reproducir audio en la sesión de
  "servicio" que SSH usa normalmente. Un pequeño asistente en segundo
  plano corre ahora en tu sesión de usuario habitual y recoge los
  anuncios desde una cola, así que el audio se reproduce correctamente
  incluso en servidores sin cabeza.

- **La vista previa de voz en la TUI funciona en servidores remotos.**
  Antes, si previsualizabas una voz desde un servidor sin altavoces,
  intentaba reproducir localmente (y fallaba). Ahora se emite
  correctamente al dispositivo remoto que hayas configurado.

- **Se acabaron las frases de introducción duplicadas.** Si
  configurabas un pretexto tanto en el servidor emisor como en la
  máquina receptora, antes lo oías dos veces. Ahora gana la versión
  del emisor — el receptor no añadirá la suya encima.

- **Los ajustes de streaming remoto ahora se quedan de verdad.** Un
  cambio reciente causaba accidentalmente que las configuraciones de
  streaming remoto (`ssh-remote`, `agentvibes-receiver`) se
  sobreescribieran y cayeran de vuelta a la reproducción local.
  Corregido.

- **Los anuncios largos no se cortan a mitad de frase.** El timeout de
  seguridad que detiene el audio atascado era demasiado agresivo para
  los mensajes largos. Ahora es lo suficientemente generoso como para
  manejar anuncios del tamaño de un párrafo.

- **Estado del instalador más limpio** — cuando instalas AgentVibes
  para Claude Code, ahora escribe su archivo de proveedor TTS de forma
  explícita en lugar de depender de estado implícito.

### 🧪 Pruebas

55 nuevas pruebas se aseguran de que el modo fiesta de BMAD siga
funcionando: cada agente obtiene su voz y música únicas, los agentes no
comparten accidentalmente el mismo ID de hablante de Piper, y el
instalador siempre apunta al modo fiesta con el punto de entrada
multiplataforma.

---

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
