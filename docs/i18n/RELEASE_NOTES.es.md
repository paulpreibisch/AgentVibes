> 🌐 [English version](../../RELEASE_NOTES.md)

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
