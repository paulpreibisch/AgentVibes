> 🌐 [English version](../../README.md)

## 🌟 NUEVO EN v4.5 — Lanzamiento "Habla Todos los Idiomas"

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
