> 🌐 [English version](../../README.md)

## 🌟 NOVO NO v4.5 — Lançamento "Fale Todos os Idiomas"

### 🌍 TUI Multilíngue — 9 Idiomas

Cada tela, botão e rótulo no `npx agentvibes` está agora totalmente traduzido:

- **Inglês, Espanhol, Francês, Alemão, Português, Japonês, Coreano, Chinês (Simplificado), Italiano**
- Seleção de idioma no primeiro lançamento — escolha seu idioma antes de qualquer coisa
- Sub-aba de idioma em Configurações — mude ao vivo, sem necessidade de reinicialização
- Todos os rótulos de abas, botões, dicas de rodapé, mensagens de status e abas BMAD/Receiver traduzidos
- Arquivos i18n por idioma (`src/i18n/en.js`, `es.js`, `fr.js`, ...) com fallback para inglês

### 🪟 Endurecimento de Segurança do Windows

- **Arquivos temporários imprevisíveis** — `randomUUID()` substitui `Date.now()` em todos os nomes de arquivos temporários (JS + PowerShell)
- **Sem injeção de shell** — `spawnSync` substitui `execSync(..., { shell: true })` para buscas `which`
- **Detecção inteligente de player de música** — `detectMp3Player()` substitui o `ffplay` fixo no Windows
- **Correção booleana** — `isWindowsTerminal` agora retorna `true/false`, não a string UUID de `WT_SESSION`

### 🎙️ BMAD Speak Multiplataforma

- `bmad-speak.js` — ponto de entrada multiplataforma; roteia automaticamente para PowerShell no Windows ou bash no Mac/Linux
- `bmad-speak.ps1` — BMAD speak nativo do Windows com roteamento de personalidade por agente

### 🧪 600 Testes, Zero Falhas
