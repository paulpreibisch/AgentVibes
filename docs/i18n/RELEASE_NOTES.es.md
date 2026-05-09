> 🌐 [English version](../../RELEASE_NOTES.md)

## 🐧 v5.6.8 — Enrutamiento de Voz en WSL Corregido + Fiabilidad del Ciclo de Vida de Sesión

**Lanzamiento:** 2026-05-09

### 🐛 WSL: Ahora se Reproduce la Voz Configurada (No el Fallback Lessac)

En sesiones WSL, AgentVibes reproducía `en_US-lessac-medium` sin importar qué voz hubieras configurado. La causa raíz: `pipx` instala Piper en `~/.local/bin/`, que los shells interactivos obtienen mediante `.bashrc`/`.zshrc`, pero las llamadas a la herramienta Bash de Claude Code se ejecutan de forma no interactiva y omiten la carga del perfil — `command -v piper` fallaba y recurría a la voz predeterminada.

**Corrección:** `play-tts-piper.sh` ahora antepone `~/.local/bin` y el bin del venv de Piper de pipx al `PATH` antes de la comprobación del binario, de modo que Piper se encuentra independientemente del modo del shell.

### 🐛 Voz/Música por Proyecto Perdida Cuando `CLAUDE_PROJECT_DIR` No Está en el Entorno Bash

Cuando Claude Code ejecuta una llamada a la herramienta Bash, `CLAUDE_PROJECT_DIR` no se pasa en el entorno. Los hooks de TTS no podían encontrar la configuración por proyecto y recurrían a los valores predeterminados globales — voz incorrecta, música incorrecta, sin pretexto.

**Corrección:** `session-start-tts.sh` (y `.ps1`) ahora incorpora el directorio del proyecto en el comando hook inyectado como `--project-dir`. `play-tts.sh` lee este parámetro antes de cualquier búsqueda de configuración, por lo que el enrutamiento por proyecto es fiable en cada llamada a la herramienta Bash.

### 🐛 `play-tts-piper.sh` y `play-tts-piper.ps1` No Desplegados por `agentvibes install`

Estos hooks faltaban en `CRITICAL_HOOKS` / `CRITICAL_HOOKS_WINDOWS`, por lo que `agentvibes install` nunca propagaba versiones actualizadas a `~/.claude/hooks/`.

**Corrección:** Ambos están ahora en la lista de hooks críticos y siempre se despliegan al instalar/actualizar.

### 🐛 Errores en el Nombre a Mostrar de la Voz

- `uniquifyVoiceName("Mary-1")` devolvía `"Mary-1 Bell"` en lugar de `"Mary Bell"`.
- Nombres de 16Speakers como `Rose_Ibex` recibían incorrectamente un apellido añadido (`"Rose Ibex Bell"`).
- La línea `🎤 Voice used:` faltaba en la salida de bash de WSL.

Los tres corregidos. Un nuevo archivo de pruebas (`test/unit/voice-names.test.js`, 16 pruebas) cubre estos casos.

---

## 🪟 v5.6.7 — Vista Previa en Windows Corregida

**Lanzamiento:** 2026-05-08

### 🐛 El Botón de Vista Previa Ahora Funciona Correctamente en Windows

Al configurar el audio por LLM en Windows, hacer clic en **Vista Previa** reproducía la voz incorrecta (utilizando por defecto Windows SAPI) sin música de fondo ni reverberación. Ahora reproduce exactamente la voz, reverberación y pista de fondo que configuraste.

### 🧪 Pruebas de Regresión Añadidas

Dos nuevas pruebas de CI para Windows verifican la búsqueda de configuración de vista previa — así que esto no puede regresar silenciosamente en una versión futura.

---

## 🔇→🎵 v5.6.6 — Vista Previa de Música de Fondo Corregida para npm link e Instalaciones Globales

**Lanzamiento:** 2026-05-08

### 🐛 Música de Fondo Silenciosamente Ausente en la Vista Previa (npm link / Instalación Global)

Cuando hacías clic en **Vista Previa** en el modal de configuración de LLM con una pista de fondo definida, solo escuchabas la voz — sin música — salvo que AgentVibes estuviera instalado como dependencia local. Corregido independientemente de cómo instales AgentVibes.

**Causa raíz:** En configuraciones con `npm link` e instalación global, un script de sincronización que usaba `rsync --delete` borraba periódicamente `background-music-enabled.txt` del directorio del paquete porque el archivo está en el gitignore. Tras la eliminación, `audio-processor.sh` recurría a una configuración global con la música desactivada — silencio.

**Corrección:** `audio-processor.sh` ahora comprueba `CLAUDE_PROJECT_DIR/.claude/config/background-music-enabled.txt` **primero**. La Vista Previa de la TUI también escribe el indicador en el directorio del proyecto (no en el directorio del paquete), para que sobreviva a cualquier sincronización del directorio del paquete.

### 🐛 Configuración por LLM No Encontrada en npm link / Instalaciones Globales

En las mismas configuraciones, `audio-processor.sh` no encontraba la configuración de audio por LLM (voz, reverb, pista de fondo) cuando tu proyecto no era el propio paquete AgentVibes.

**Corrección:** El script ahora busca en `CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg` antes de recurrir a la configuración del paquete.

### 🐛 Pista de Fondo "No Encontrada" Tras una Configuración Correcta

Cuando una pista de fondo estaba configurada pero AgentVibes estaba instalado globalmente o vía `npm link`, no se encontraba el archivo de pista — solo se buscaba en el directorio del paquete.

**Corrección:** `audio-processor.sh` ahora también busca en `CLAUDE_PROJECT_DIR/.claude/audio/tracks/` cuando la pista no está en el directorio del paquete.

### 🐛 Análisis de Filas de Configuración LLM — Volumen Absorbiendo Columnas Extra

Con una fila LLM completa de 7 columnas (el formato que escribe la TUI), el campo de volumen absorbía todas las columnas finales. ffmpeg recibía una cadena de volumen malformada y silenciosamente recurría a audio solo de voz.

**Corrección:** El analizador ahora captura únicamente el campo de volumen numérico, dejando las columnas extra en `_rest`.

### 🧪 Suite de Pruebas de CI para Windows

Las pruebas nativas de Windows ahora se ejecutan en CI junto con la suite BATS de Linux, bloqueando la publicación para que las rutas específicas de Windows no puedan regresar silenciosamente.

---

## 🛡️ v5.6.4 — Corrección Crítica de Seguridad en la Desinstalación

**Lanzamiento:** 2026-05-08

### 🐛 La desinstalación con `--global` ya no borra ~/.claude/

Con `--global`, el desinstalador estaba eliminando `~/.claude/` de forma recursiva en lugar de únicamente las rutas dentro de ella que pertenecen a AgentVibes. Esto causaba pérdida total de datos — ajustes, CLAUDE.md, skills, plugins, configuraciones MCP, herramientas personalizadas, todo. Confirmado como real, confirmado como corregido.

**v5.6.4 realiza una eliminación quirúrgica — solo las rutas instaladas por AgentVibes:**

- `~/.claude/hooks/`, `hooks-windows/`, `commands/agent-vibes/`, `personalities/`, `audio/`
- `~/.agentvibes/` — de propiedad total de AgentVibes, eliminado por completo
- `settings.json`, `CLAUDE.md`, skills, plugins, configuraciones MCP — **intactos**

Una prueba de regresión aplica ahora esta restricción en CI. Si alguien vuelve a introducir una eliminación amplia, la compilación falla:

```js
// issue #182 regression guard
assert: settings.json and CLAUDE.md survived --global uninstall
```

Esto no puede volver a ocurrir silenciosamente — primero romperá la compilación.

---

## 🌟 v5.6.3 — AgentVibes llega a Hermes + Configuración remota más sencilla

**Lanzamiento:** 2026-05-07

### 🎉 AgentVibes ahora funciona con Hermes

**[Hermes](https://github.com/NousResearch/hermes-agent)** es uno de los agentes de IA de código abierto más populares de GitHub — más de 21.000 estrellas y creciendo. AgentVibes ahora se integra con él desde el primer momento: cuando Hermes termina una respuesta, AgentVibes la habla en voz alta a través de tus altavoces automáticamente. No hace falta ninguna configuración adicional más allá de instalar el hook incluido.

### 🎉 Destino de audio por LLM — elige de dónde sale la voz

Cuando configuras un LLM en AgentVibes (Claude Code, Copilot, Codex o Hermes), ya podías asignar una **voz, estilo de reverb, música de fondo y prefijo de introducción** únicos para cada uno. Ahora también puedes establecer el **destino de audio** por LLM:

- **Local** — reproducir a través de los altavoces del ordenador en el que estás trabajando
- **Remoto** — enviar el audio a una máquina diferente (tu portátil, por ejemplo) mientras trabajas en un servidor remoto o ejecutas Hermes en la nube

### 🎉 Selector de alias SSH — sin necesidad de escribir rutas

Configurar el audio remoto antes requería escribir una ruta SSH a mano. Ahora hay un **menú desplegable directamente en la TUI de AgentVibes** que lee los alias SSH que ya tienes en tu máquina. Elige el que apunta a tus altavoces — listo. Tu voz te sigue tanto si estás en local como en remoto.

### 🐛 Correcciones

- **Sin audio en absoluto** — algunas configuraciones producían silencio completo sin ningún mensaje de error. Corregido.
- **Voz incorrecta reproduciéndose** — en algunas configuraciones, AgentVibes ignoraba tus ajustes de voz por IA y volvía al valor predeterminado. Corregido.
- **Configuraciones de audio filtrándose entre mensajes** — la música o el reverb configurado para un mensaje podría transferirse accidentalmente al siguiente. Corregido.
- **Mensajes perdidos tras un fallo** — si AgentVibes fallaba en mitad de un mensaje, ese mensaje se perdía. Ahora lo recupera y lo reproduce cuando se reinicia.

---

## 🎛️ v5.6.2 — Per-Message Audio Control for Remote Providers

> See [English release notes](../../RELEASE_NOTES.md) for full details.

---


## 🤖 v5.6.1 — Integración con Hermes Agent y Correcciones PS5.1 para Windows

**Lanzamiento:** 2026-05-01

### 🎉 Integración con Hermes Agent (¡Nuevo!)

AgentVibes ahora soporta oficialmente **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — el asistente de IA autohospedado y automejorado. Dos skills de Hermes listas para producción se incluyen en `docs/hermes/skills/`:

**`hermes-agentvibes-hook`** — Habla automáticamente cada respuesta de Hermes vía AgentVibes
- Se activa en cada evento `agent:end` (Telegram, Discord, CLI, etc.)
- Elimina markdown, bloques de código y emojis antes de hablar
- Trunca en límites de palabras, limita la tasa para evitar inundación de la cola
- SSH seguro contra MITM con `StrictHostKeyChecking=accept-new` + `known_hosts` persistente
- Registro completo en `tts-hook.log` para depuración

**`agentvibes-target`** — Enseña a Hermes a enviar cualquier texto a tus altavoces bajo demanda
- Payload JSON en base64 vía SSH (misma arquitectura ForceCommand que el receptor de Windows)
- Compatible con objetivos Windows y Android
- Guía de solución de problemas detallada incluida

**Instalación:** Copia la skill a tu directorio home de Hermes y reinicia el gateway:
```bash
cp -r docs/hermes/skills/tts/hermes-agentvibes-hook ~/.hermes/skills/tts/
hermes gateway restart
```

### 🐛 Correcciones PS5.1 para Windows

- **Compatibilidad PS5.1 de play-tts.ps1** — Corregidas tres regresiones del rebase de v5.6.0:
  reemplazado el operador null-condicional de PS7 (`?.`) por if/else compatible con PS5.1, añadido BOM UTF-8
  para que los guiones largos no se corrompan con CP1252, restaurado el alias del proveedor piper y
  el centinela `AGENTVIBES_TEXT_FILE` perdidos en la fusión
- **Correcciones de modal y atajos de teclado** — Tecla escape del modal, atajos de navegación, Q+Bloq Mayús
  y manejo de errores de vista previa de voz reparados
- **Pestaña BMAD** — Ahora muestra todos los agentes sin importar el módulo

---

## 🎵 v5.5.0 — Enrutamiento de Audio por LLM y Resistencia del Instalador de Windows

**Lanzamiento:** 2026-04-27

### 🆕 Enrutamiento de Audio por LLM
Cada LLM (Claude Code, Copilot, Codex) puede tener ahora su propia voz, pretexto, reverb y
configuración de música de fondo. El servidor MCP pasa `--llm <key>` tanto a `play-tts.sh`
(Linux/macOS) como a `play-tts.ps1` (Windows), y los scripts buscan filas `llm:<key>` en
`audio-effects.cfg`. Las filas predeterminadas para `claude-code`, `copilot` y `codex` se incluyen
de serie; configúralas en **Setup → Default → Configure** en la TUI.

### 🐛 Corrección del Crash del Instalador de Windows
Se corrigió el error `spinner.info is not a function` que hacía fallar las **reinstalaciones** de AgentVibes en Windows
cuando los usuarios tenían una instalación global anterior. Las 10 funciones de copia de archivos del instalador ahora
envuelven su spinner con `createRobustSpinner()` para que los llamadores obsoletos no puedan provocar un crash
independientemente de los métodos que expongan.

### 🎶 Paridad de Música de Fondo en Windows
La reproducción TTS de Windows ahora prefiere `ffplay` (remuestreo sinc, sin artefactos) sobre el remuestreador
`SoundPlayer` de WinMM de baja calidad. El nuevo helper `Invoke-AudioPlay` gestiona el fallback de forma
transparente — si `ffplay` no está disponible, se usa `SoundPlayer` como antes.

### 🎉 Punto de Entrada Multiplataforma del Modo Fiesta
Los archivos de pasos del modo fiesta de BMAD y la skill de Copilot ahora hacen referencia de forma consistente a
`node bin/bmad-speak.js` — el único punto de entrada multiplataforma que delega a
`bmad-speak.ps1` en Windows y `bmad-speak.sh` en otros sistemas.

### 🔧 Otras Correcciones
- `play-tts.sh` ahora acepta un flag con nombre `--llm <key>` además de la variable de entorno `LLM_PROVIDER`
- `mcp-server/server.py` enruta la cadena de prioridad `AGENTVIBES_LLM` → `CLAUDECODE=1` → `AGENTVIBES_MCP_FALLBACK`
  y reenvía la clave resuelta como `-llm`/`--llm` a los scripts TTS
- Añadidas filas en `audio-effects.cfg` para `llm:claude-code`, `llm:copilot`, `llm:codex`
- Añadidos `command-routing.test.js` y pruebas unitarias de `ConfigService`
- El guardián de contenido de npm pack ahora detecta archivos publicables sin seguimiento

### 📊 Técnico
- 231 pruebas pasando (0 fallos)

---

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
