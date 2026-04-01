> 🌐 [English version](../../RELEASE_NOTES.md)

## 🌍 v4.5.0 — Lançamento "Fale Todos os Idiomas"

**Data de lançamento:** Abril de 2026

Suporte TUI multilíngue completo em todos os 9 idiomas, endurecimento completo de segurança do Windows e zero testes com falha.

### 🌍 TUI Multilíngue — 9 Idiomas

Cada tela, aba, botão e rótulo na TUI do `npx agentvibes` está agora completamente traduzido:

- **Inglês, Espanhol, Francês, Alemão, Português, Japonês, Coreano, Chinês (Simplificado), Italiano**
- Seleção de idioma no primeiro lançamento (Tela 0 do assistente de instalação)
- Sub-aba de idioma em Configurações — mude o idioma ao vivo sem reinicialização
- Todos os rótulos da barra de abas, texto de botões, dicas de rodapé e mensagens de status traduzidos
- Aba BMAD e aba SSH Receiver completamente localizadas
- Arquivos i18n por idioma com fallback para inglês

### 🪟 Segurança e Correções de Bugs do Windows

- **Nomes de arquivos temporários** — Todos os nomes de arquivos temporários com `Date.now()` substituídos por `randomUUID()` (imprevisível, previne sequestro de arquivos temporários)
- **Injeção de shell** — `execSync('which ...', { shell: true })` substituído por `spawnSync`
- **Player de música** — `ffplay` fixo no Windows substituído por `detectMp3Player()`
- **Coerção booleana** — `isWindowsTerminal` retorna corretamente `true/false` em vez de vazar a string UUID de `WT_SESSION`

### 🎙️ BMAD Speak Multiplataforma

- `bin/bmad-speak.js` — ponto de entrada multiplataforma para fala de agentes BMAD
- `.claude/hooks-windows/bmad-speak.ps1` — BMAD speak nativo do Windows com roteamento de personalidade por agente

### 🧪 Suite de Testes

- 600 testes, 0 falhas
