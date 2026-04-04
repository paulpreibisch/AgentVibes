> 🌐 [English version](../../RELEASE_NOTES.md)

## 🐛 v4.6.8 — Correção de Falha em Instalação Limpa

**Data de lançamento:** Abril de 2026

### Correções de Bugs

- **A aba de Configurações não falha mais em uma instalação limpa** — `parseMultiSpeaker()` chamava `.includes()` em um voice ID nulo quando nenhuma voz estava configurada ainda. Foi adicionada uma proteção contra nulo que retorna um objeto padrão seguro. Reportado por um usuário que encontrou esse problema imediatamente após completar o assistente de instalação.

- **Symlink do macOS /var no teste de reprodução** — Corrigida uma asserção de teste que falhava no macOS onde `/var` é um symlink para `/private/var`, causando falha nas comparações de caminhos de reprodução.

- **Análise de pretext no BMAD voices** — As linhas de pretext em `bmad-voices.md` agora são analisadas corretamente e o markdown é removido mais completamente antes da síntese TTS.

### Impacto para o Usuário

- Novos usuários não experimentam mais falhas ao navegar para Configurações após uma instalação limpa
- A suite de testes funciona corretamente no macOS

---

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

---

## 🐛 v4.5.1 — Lançamento de Correção

**Data de lançamento:** Abril de 2026

### Correção de Bug

- **Pré-visualização da aba Música** — Pressionar Espaço em uma faixa na aba Música agora reproduz corretamente
  ao executar `npx agentvibes` a partir de um diretório novo. Anteriormente, se `.claude/audio/tracks/`
  não existia no diretório de trabalho atual, a lista de faixas mostrava as faixas integradas mas
  Espaço não fazia nada (o player era iniciado contra um caminho inexistente). Agora recorre
  automaticamente ao diretório de faixas incluído no pacote.
