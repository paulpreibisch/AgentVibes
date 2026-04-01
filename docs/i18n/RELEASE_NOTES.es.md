> 🌐 [English version](../../RELEASE_NOTES.md)

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
