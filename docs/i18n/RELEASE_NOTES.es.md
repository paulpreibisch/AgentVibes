> 🌐 [English version](../../RELEASE_NOTES.md)

## 🔧 v5.13.2 — Instalaciones más limpias, configuración más sencilla

**Lanzamiento:** 2026-07-17 · en `latest` — `npm install agentvibes@latest`

### 🎛️ Empiezas con la configuración por defecto, lista para hacerla tuya

Las instalaciones nuevas ahora empiezan limpias, con los valores por defecto integrados para voz, música de fondo y personalidad — así que es tu configuración desde la primera vez que la ejecutas.

### 🐧 La instalación en Mac y Linux funciona correctamente

Algunos de los scripts que preparan todo estaban guardados en un formato de Windows que Mac y Linux no pueden leer, así que se detenían antes de hacer nada. Ahora están en el formato correcto. Instalar Piper y descargar voces vuelve a funcionar en una máquina Mac o Linux recién configurada.

### 🔊 Tu elección de voz se mantiene

El archivo de configuración que recuerda qué voz va con qué motor podía leerse un poco mal, así que tu elección de motor se ignoraba en silencio. Arreglado — lo que eliges es lo que obtienes.

### 📦 Una descarga más pequeña y ordenada

El paquete ya no incluye archivos que nunca necesitó. Todo lo que la aplicación te dice que ejecutes ahora está realmente incluido.

---

## 🔧 v5.13.1 — Actualizaciones de Windows que de verdad actualizan

**Lanzamiento:** 2026-07-16 · en `latest` — `npm install agentvibes@latest`

### 🪟 Tus scripts de Windows ahora sí se actualizan de verdad

En Windows, los pequeños scripts que hacen que tus agentes hablen viven en tu carpeta `.claude/hooks`. Actualizar decía que los refrescaba — pero en Windows, en silencio, no lo hacía, así que podían quedarse con la versión que instalaste por primera vez durante meses.

Ahora sí se actualizan de verdad. Ejecuta `npx agentvibes update` y recibirás cada arreglo que te estabas perdiendo. Todo lo que hayas personalizado tú mismo sigue a salvo justo al lado, como un archivo `.user.bak`, igual que antes.

Si usas macOS o Linux, no cambia nada — las actualizaciones ya funcionaban bien para ti.

### 🔒 Un pequeño ajuste de seguridad, entre bastidores

Actualizamos una de las piezas que AgentVibes usa para leer archivos de configuración. Un archivo de configuración especialmente manipulado podría haber hecho que se quedara atascado. Nunca pudo robarse ni espiarse nada — pero ahora tampoco puede quedarse colgado. No tienes que hacer nada; ya está incluido.

---

## 🎉 v5.13.0 — Tus Voces en Todas Partes, Con un Aviso Previo

**Lanzamiento:** 2026-07-16 · en `latest` — `npm install agentvibes`

Novedades:

### 🖥️ Usa las voces propias de tu ordenador, desde cualquier lugar
¿Ejecutas tus agentes en una máquina y escuchas en otra? Ahora puedes elegir las voces integradas en **Windows** (David, Zira, Mark) o **Mac**, y escucharlas justo donde estás sentado. AgentVibes te muestra todas las voces y marca claramente las que tu dispositivo de escucha puede reproducir.

### 🗂️ Todas tus voces en una lista ordenada
Piper, Kokoro, ElevenLabs, Windows, Mac, Soprano — cada voz proviene ahora de una sola lista, así que lo que ves es siempre lo que puedes usar.

### 🔔 Un tono de "aviso" antes de que suene el audio
Justo antes de que empiece una línea de voz o una vista previa de música, escucharás un breve tono — para que siempre sepas que el audio está en camino, incluso si tarda un momento.

### 🎵 Las vistas previas de música siguen tu audio
Previsualiza una pista y se reproduce allí donde esté configurado tu audio — incluso en otro ordenador.

### 🆔 Agentes que se presentan a sí mismos
Activa las auto-presentaciones y cada agente dice quién es cuando arranca — muy útil cuando todo un equipo está hablando.

### 🛟 Tus propios cambios quedan a salvo al actualizar
¿Modificaste alguno de los archivos de AgentVibes en tu carpeta `.claude/hooks`? A partir de esta versión, actualizar nunca tira tu trabajo por la borda. Si necesitamos actualizar un archivo que hayas cambiado, guardamos tu copia justo al lado con `.user.bak` al final — por ejemplo, `play-tts.sh.user.bak`.

**Ese archivo lo crea AgentVibes — no hay nada roto y nada más lo puso ahí.** Es simplemente tu versión anterior, guardada para que puedas echarle un vistazo o copiar tus cambios de vuelta al archivo nuevo. Bórralo cuando ya no lo necesites.

Si personalizaste archivos en una versión anterior, vale la pena echar un vistazo rápido en `.claude/hooks` por si hay algo que quieras recuperar.

### ✨ Más voces, marcha más suave
- Voces de **ElevenLabs** totalmente soportadas
- Más voces de **Kokoro**, funcionando de maravilla en Windows
- Configuración más rápida y fiable en Windows
- **3.261 pruebas automatizadas pasando** — estable y confiable

---

## 🎉 v5.12.0 — La Renovación de la Semana Fable (Estable)

**Lanzamiento:** 2026-07-05 · ahora en `latest` — `npm install agentvibes`

Esto convierte la versión alpha de la "Semana Fable" en un lanzamiento estable. Durante una semana de acceso anticipado al nuevo modelo **Fable** de Anthropic, lo apuntamos a todo el código de AgentVibes y reconstruimos el núcleo como es debido.

### Un núcleo más sólido y compartido

Cada vez que AgentVibes habla toma muchas decisiones: qué voz, qué motor, si reproducir aquí o enviar el audio a otra máquina, música de fondo, volumen, silencio. Esa lógica se había copiado en varios scripts separados (Mac/Linux, Windows, remoto y el servidor de voz), y las copias fueron **divergiendo poco a poco** — una corrección en una se olvidaba en las otras, motivo por el cual ciertos fallos seguían reapareciendo.

Reemplazamos todo eso con **un único núcleo compartido** que ahora sigue cada parte de AgentVibes — un solo lugar que corregir, un solo lugar en el que confiar. Lo que notarás:

- **Las voces de Kokoro que estaban en silencio en Linux ahora funcionan en todas partes.**
- **Tus elecciones de voz se mantienen** — la configuración ya no se sobrescribe silenciosamente.
- **El volumen, el silencio y la reproducción remota se comportan igual** en Mac, Linux y Windows.
- **Seguro por defecto** — si el nuevo núcleo no está disponible en tu máquina, AgentVibes recurre al comportamiento anterior, así nunca deja de hablar.

### Las vistas previas ahora se reproducen en el lugar correcto

Previsualizar una voz o una pista solía reproducirse en la máquina donde estuvieras sentado — lo que era silencio si habías configurado AgentVibes para enviar su audio a otro sitio. Ahora:

- **Si tienes configurado SSH remoto, las vistas previas se reproducen en tu receptor; de lo contrario se reproducen localmente, como antes.**
- Esto cubre las **vistas previas de voz** (Piper y Kokoro) desde las pantallas de Configuración (Setup), Agente y Ajustes, y las **vistas previas de música/pistas** — pulsa Espacio para reproducir, Espacio de nuevo para detener.

### Un menú de voces más sencillo

- **Eliminamos la pestaña Voces redundante.** Solo listaba voces de Piper y confundía a la gente, ya que elegir una voz para cualquier proveedor ya vive en **Setup**.

### Bases para lo que viene

- El receptor ahora también recibe la **ruta completa de la carpeta del proyecto** desde la que se envió un mensaje (un nuevo campo `projectPath`, junto al nombre del proyecto que ya recibía) — sentando las bases para las próximas mejoras.

### Revisado antes de publicar

Ejecutamos tres revisiones independientes sobre los cambios — seguridad, correctitud y regresiones — y corregimos cada problema real antes del lanzamiento.

## 🎸 v5.8.0 — Soprano Ahora Funciona + Selector de Voz Corregido para Todos los Motores

**Lanzamiento:** 2026-05-18

### 🐛 Soprano TTS Estaba Roto — Ahora Corregido

Soprano (nuestro motor de TTS neuronal de 80M de parámetros, introducido en v5.6) fallaba silenciosamente en Windows. Varios problemas combinados lo rompían de extremo a extremo:

- El selector de voz de Windows mostraba Soprano como opción pero lo lanzaba con el nombre binario incorrecto (`soprano-tts` en lugar de `soprano`)
- `play-tts-soprano.ps1` era llamado desde Node.js con un PATH recortado, por lo que los ejecutables `soprano` y `soprano-webui` no podían encontrarse aunque estuvieran instalados
- La ruta del archivo wav se escribía en el flujo de Información de PowerShell (`Write-Host`) en lugar de stdout, por lo que el procesador de reverb/música de fondo no podía encontrarla y salía con un error
- El Gradio WebUI nunca se iniciaba automáticamente — tenías que ejecutar `soprano-webui` manualmente antes de cada sesión

Todos estos problemas están ahora corregidos. AgentVibes detecta automáticamente si el servidor WebUI de Soprano está ejecutándose en el puerto 7860, lo inicia si no, y sondea hasta que esté listo (hasta 90 segundos). Tres modos funcionan en orden de prioridad: WebUI (más rápido — el modelo permanece cargado) → API compatible con OpenAI → CLI `soprano` directo.

### 🐛 El Selector de Voz Ignoraba Windows SAPI y macOS Say

Al abrir el selector de voz para un LLM configurado para usar **Windows SAPI** o **macOS Say**, el selector mostraba la lista completa de voces de Piper en lugar de la voz integrada del motor. Esto era confuso — seleccionar una voz de Piper mientras se usa SAPI o macOS Say no tenía efecto, y la vista previa con la barra espaciadora reproducía a través del motor incorrecto.

El selector ahora se adapta al motor seleccionado:

- **Windows SAPI / macOS Say / Soprano:** muestra exactamente un elemento (la voz integrada del motor), lo auto-selecciona, y la vista previa con barra espaciadora habla a través del binario del motor correcto
- **Piper:** muestra el catálogo completo de voces instaladas como antes

Además, guardar la configuración ya no sobrescribe silenciosamente el campo `ttsEngine` a `piper` cuando un motor nativo está en uso.

### 🔒 Fiabilidad de Soprano (9 Correcciones de Revisión Adversarial)

- **Corrección de bloqueo:** `destroy()` del socket podría emitir un evento `error` tardío sin receptor, bloqueando el proceso Node.js — ahora hay un manejador absorbente
- **Cancelación de bucle:** el bucle de sondeo del WebUI de 90 segundos ahora se detiene inmediatamente cuando el modal o el selector de voz se cierra (vía AbortController)
- **Sin rechazos no manejados:** manejadores `.catch()` añadidos a todas las llamadas async de verificación del WebUI
- **Sin procesos duplicados:** un tiempo de espera de 10 segundos evita lanzar dos instancias de `soprano-webui` cuando se hace clic rápido en Vista Previa
- **Mejor retroalimentación de errores:** los fallos de spawn y los códigos de salida distintos de cero ahora muestran una etiqueta de error visible en el selector de voz
- **PATH preservado:** la actualización del PATH en PowerShell ahora añade las entradas del registro en lugar de reemplazar todo el PATH, para que los shims de nvm, conda y pyenv sigan funcionando

---

## 🎭 v5.7.7 — Restauración de Voces en Modo Party + Mejoras

**Lanzamiento:** 2026-05-17

### 🐛 Agentes en Modo Party Sin Sonido (Sin TTS por Agente)

Los agentes del modo party mostraban las respuestas en texto pero no las leían con sus voces únicas. Dos causas raíz:

**Desambiguación del skill:** `/party-mode` coincidía con el comando BMAD `_bmad/core/workflows/party-mode` (que intenta cargar una ruta que no existe en este proyecto) en lugar del skill de AgentVibes. Una anulación de comando `/party-mode` local al proyecto ahora enruta al skill correcto.

**Paso TTS obligatorio:** El paso de llamada a `bmad-speak.js` del orquestador estaba mal especificado, por lo que a veces se omitía. El Paso 4 en el skill del modo party BMAD ahora está claramente marcado como OBLIGATORIO, con documentación explícita de lo que `bmad-speak.js` aplica por agente: voz, pretext, reverb, personalidad y música de fondo — todo cargado automáticamente desde `~/.agentvibes/bmad-voice-map.json`.

### 🔍 Registro de Diagnóstico para Modo Party

`bmad-party-speak.sh` (hook PostToolUse) ahora escribe entradas de diagnóstico estructuradas en `/tmp/agentvibes-party-debug.log` — `fired`, `fingerprint HIT/MISS`, `invoking` y errores — para que los problemas de voz sean diagnosticables sin adivinar.

### 🎵 Nueva Pista Incluida: CelestialVelvet

Una nueva pista de música ambiental **CelestialVelvet** (🌌) se ha agregado al catálogo integrado. Disponible inmediatamente en el selector de música TUI y el mapa de voces BMAD — sin descarga requerida.

### 🐛 TUI: Texto Gris en Filas Seleccionadas Corregido

El texto blanco ahora se muestra correctamente en las filas seleccionadas de las pestañas Voces y Agentes. Anteriormente, el primer plano `bright-black` combinado con el fondo verde producía texto gris ilegible en muchos terminales.

### 🐛 SSH Remoto: Error "wait: pid is not a child of this shell"

`play-tts-ssh-remote.sh` emitía `wait: pid X is not a child of this shell` en ciertos shells. Corregido iniciando `ssh` directamente dentro del subshell en segundo plano para que `$?` capture el código de salida sin una llamada `wait` entre shells.

---

## 🔧 v5.7.6 — Integridad del Payload SSH Remoto + Reescritura del Receptor

**Lanzamiento:** 2026-05-16

### 🐛 SSH Remoto Reproduciendo Música y Voz Incorrectas

Al usar la función TTS SSH remoto, se aplicaban la pista de música y la voz del proyecto incorrecto. Causa raíz: `CLAUDE_PROJECT_DIR` no se reenviaba al emisor, causando que usara la configuración global en lugar del `audio-effects.cfg` del proyecto activo.

### 🐛 Receptor Bash Incompatible con el Formato de Payload JSON

El receptor bash de Linux/Termux (`agentvibes-receiver.sh`) usaba un formato de argumentos posicionales de pre-v5.5 y no podía decodificar el payload base64 JSON actual en absoluto. El receptor ha sido completamente reescrito para coincidir con la lógica del receptor PowerShell: decodifica base64, analiza JSON, aplica voz/música/efectos/volumen y valida todos los campos.

### 🐛 Introducción de Personalidad Escuchada Dos Veces en Remoto

El pretext de personalidad (ej., "Bcs latin dance here") se escuchaba dos veces al usar TTS SSH remoto. Causa raíz: `play-tts.sh` ya antepone el pretext al texto del habla antes de llamar al emisor; el emisor también lo empaquetaba en el campo JSON `pretext`, causando que el receptor lo antepusiera de nuevo. El campo JSON `pretext` ahora se deja intencionalmente vacío — la personalidad se entrega solo a través del campo `text`.

### 🆕 Alias de Host SSH Visible en la Pestaña de Configuración

El alias de host SSH remoto configurado ahora se muestra en las pestañas de Configuración y Voces para que los usuarios puedan confirmar a qué máquina remota se dirige el TTS sin abrir archivos de configuración.

### 🔒 Correcciones de Seguridad

Mejoras de validación de entrada en el emisor y receptor SSH remoto.

### 🧪 24 Nuevas Pruebas BATS

- 15 pruebas de payload SSH remoto: verifican voz, pista de música, volumen, reverb/efectos, manejo de pretext, identificador LLM, precedencia de configuración del proyecto y validez JSON
- 9 pruebas de viaje de ida y vuelta de extremo a extremo: el emisor construye el payload → el receptor decodifica y aplica todos los campos simultáneamente, detectando regresiones en ambos extremos

---

## 🖥️ v5.7.5 — Contraste de Botones TUI + Correcciones de Enrutamiento BMAD

**Lanzamiento:** 2026-05-13

### 🐛 Foco de Botones TUI: Texto Gris Eliminado en Todos los Terminales

Los botones enfocados y seleccionados en la TUI mostraban texto gris claro sobre fondos azul claro en muchos terminales. Causa raíz: `bold: true` combinado con un color de primer plano oscuro activa el "modo brillante" del terminal, renderizando el color como gris independientemente del tono.

**Corrección:** Todos los estados de foco de botones ahora usan **texto blanco sobre fondo verde oscuro (`#2e7d32`)** — el mismo patrón de alto contraste que ya usaba la pestaña de Agentes. Se añadieron manejadores explícitos de `focus`/`blur` a los botones modales de setup-tab para evitar que `attachBtnBlink` interfiera con la aplicación de colores `style.focus` pasivo de blessed.

### 🐛 Indicador ♪ del Selector de Voz en Pestaña BMAD No Aparecía

El indicador ♪ de vista previa en la lista de voces de la pestaña BMAD no aparecía durante la vista previa. La pestaña de Agentes carecía de las llamadas `_refreshVP()` que la pestaña de Configuración ya tenía. Un temporizador de visualización mínimo de 2 segundos mantiene el indicador visible cuando SSH-remoto termina inmediatamente (modo fire-and-forget).

### 🐛 Instalación No Interactiva: Pretext Genérico en Lugar del Nombre del Proyecto

Ejecutar `agentvibes install` de forma no interactiva siempre establecía el pretext como `"Claude Code here"` independientemente del proyecto. El instalador ahora deriva un pretext consciente del proyecto a partir de `path.basename(process.cwd())` con capitalización (ej., `"MyProject here"`), con respaldo seguro para rutas raíz de Docker.

### 🐛 Pretext Global Anulando la Configuración por Proyecto

`seedAllLlmDefaultsSync` sembraba las filas LLM a nivel de proyecto con la cadena de pretext global, haciendo que el `"Claude Code here"` global anulara los valores de `tts-pretext.txt` por proyecto. Las filas a nivel de proyecto ahora se siembran con pretexts vacíos para que el archivo por proyecto tome precedencia.

### 🐛 Variante de TERM `screen`/`tmux` Causaba Error de Capacidad `plab_norm`

Cuando `TERM` era una variante `screen-*` o `tmux-*`, blessed lanzaba un error de capacidad `plab_norm` al arrancar. La aplicación ahora sobreescribe `TERM` a `xterm-256color` antes de crear la pantalla blessed cuando se detecta tal variante.

### 🐛 Música/Reverb por Agente BMAD No Llegaba al Receptor SSH

`play-tts.sh` no reenviaba `AGENT_PROFILE_FILE` al transporte remoto SSH, por lo que las anulaciones de música de fondo y reverb por agente en la pestaña BMAD se ignoraban silenciosamente para el audio remoto. La ruta del archivo de perfil ahora se pasa como argumento 4 a `play-tts-ssh-remote.sh`.

### 🐛 Compatibilidad con Node 18: `import.meta.dirname` Reemplazado

Un archivo de prueba usaba `import.meta.dirname`, disponible solo en Node 21+. Reemplazado con el patrón `fileURLToPath(import.meta.url)` para que las pruebas funcionen correctamente en Node 18 y 20.

---

## 🎭 v5.7.0 — Soporte para BMAD v6.6 + Reinicio Automático del Watcher en Windows

**Lanzamiento:** 2026-05-11

### 🆕 Compatibilidad con BMAD v6.6.0

BMAD v6.6 reestructuró la ubicación de los agentes — pasaron de `_bmad/bmm/agents/` a `.claude/skills/*/agents/`. AgentVibes ahora detecta y analiza estas nuevas rutas correctamente.

**La inyección de TTS** omite graciosamente los agentes v6.6+ (que usan Markdown simple sin secciones de activación XML/YAML) en lugar de lanzar errores. El resumen de instalación ahora informa claramente cuántos agentes se omitieron vs. modificaron.

**La detección en la pestaña BMAD** ahora encuentra BMAD instalado globalmente en `~/_bmad` (instalación en el directorio home) además de las instalaciones locales del proyecto. Anteriormente, la pestaña BMAD mostraba "No detectado" incluso cuando BMAD estaba instalado globalmente.

**Seguridad:** La validación de rutas del instalador ahora permite correctamente las rutas de BMAD bajo el directorio home del usuario, corrigiendo un falso positivo de "Ruta BMAD inválida" para instalaciones globales.

### 🆕 Watcher de TTS para Windows — Archivo Independiente + Reinicio Automático

`tts-watcher.ps1` ahora se extrae como archivo independiente en `~/.agentvibes/tts-watcher.ps1`. Ejecutar `npx agentvibes update` ahora copia el watcher más reciente **y** lo reinicia automáticamente — tanto el archivo como el proceso se actualizan en un solo paso, sin necesidad de reinicio manual.

### 🐛 Anulación de Proveedor de Windows Respetada en el Portátil

`play-tts.ps1` ahora lee la configuración `ProviderOverride` desde la configuración del lado Linux al recibir audio via SSH. Anteriormente, el portátil siempre usaba su proveedor configurado localmente incluso si el servidor especificaba uno diferente.

### 🐛 Comando Sample Añadido al Gestor de Voz

`voice-manager.sh sample` carecía de su manejador — al llamarlo caía silenciosamente en la ruta de uso/salida. Corregido.

### 🐛 El Enrutamiento SSH de Vista Previa Detecta el Endpoint Correcto

`provider-manager.sh` ahora incluye `detect_routing_llm()` que verifica `AGENTVIBES_LLM_KEY` y luego `transport-config.json` para la primera entrada `mode=remote`, de modo que el audio de vista previa llega al host SSH correcto.

---

## 🔇 v5.6.9 — Reverb y Música de Fondo Silenciosos en Instalaciones NPX

**Lanzamiento:** 2026-05-09

### 🐛 Reverb y Música de Fondo Silenciosamente Rotos para Todos los Usuarios de NPX

Cuando AgentVibes se instala mediante `npx`, los archivos de hook se extraen del paquete con permisos 644 — sin bit de ejecución. `play-tts-piper.sh` llamaba a `audio-processor.sh` directamente, que sale inmediatamente con código 126 (Permiso denegado) en un archivo no ejecutable. Todos los usuarios instalados vía `npx` obtenían TTS solo de voz — sin reverb, sin música de fondo, silenciosamente.

**Corrección 1:** `play-tts-piper.sh` ahora llama a `audio-processor.sh` mediante `bash "$SCRIPT_DIR/audio-processor.sh"`, evitando la comprobación del bit de ejecución.
**Corrección 2:** `install-deps.js` (postinstall) ahora ejecuta `ensureHookPermissions()` para hacer `chmod 755` en todos los archivos `.sh` después de npm install.

### 🐛 La Vista Previa del Navegador de Voz Ignoraba el Reverb y la Música de Fondo

El botón **Vista Previa** en el Navegador de Voz reproducía salida bruta de piper sin reverb ni música de fondo, saltando `audio-processor.sh` por completo.

**Corrección:** El audio de vista previa ahora pasa por el mismo pipeline de `audio-processor.sh` que el TTS real.

### 🐛 El MCP `text_to_speech` Devolvía Ruta de Archivo Corrupta e Información de Voz Ausente

La herramienta extraía la ruta del archivo de audio incorrectamente (incluyendo caracteres de tamaño/emoji al final) y nunca reportaba el nombre de la voz en su respuesta.

**Corrección:** Los códigos ANSI se eliminan antes del análisis, la ruta `.wav` se extrae correctamente, y la línea `🎤 Voz utilizada:` se incluye en la respuesta de la herramienta.

### 🐛 El Toggle de Música de Fondo en la TUI No Tenía Efecto

Habilitar música de fondo en la pestaña **Música** escribía en `config.json` pero no en `background-music-enabled.txt` (leído por los hooks de bash). La música permanecía desactivada tras el toggle. Guardar una pista ahora también implica habilitar la música.

---

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
