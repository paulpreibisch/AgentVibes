> 🌐 [English version](../../README.md)

**Autor**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Versão**: v4.6.8

---

## 🐛 NOVO NO v4.6.8 — Correção de Crash em Instalação Limpa

- **Crash na aba de Configurações corrigido** — não trava mais ao navegar para Configurações em uma instalação limpa sem voz configurada
- **Correção de teste no macOS** — a asserção do caminho de replay lida com o symlink `/var` → `/private/var`
- **Análise de pretext BMAD melhorada** — o pretext de vozes é extraído corretamente de `bmad-voices.md`

---

## 🎙️ v4.6.7 — Correções de TTS no Modo Festa

- **Pretextos de agentes agora são falados no modo festa** — "John, Product Manager here" era silenciosamente descartado por um bug de sincronização na pré-síntese. Corrigido.
- **Sem mais asteriscos falados** — markdown é removido antes do TTS no modo festa
- **TTS de início de sessão no Windows corrigido** — o hook agora emite JSON correto para que o TTS seja ativado de forma confiável no início da sessão
- **O hook PreToolUse não gera mais erro** em comandos grep/regex

---

## 🧭 v4.6.6 — Navegação Natural na TUI

A TUI de Configurações agora funciona como você esperaria. Para baixo move de cima para baixo por cabeçalho → sub-abas → conteúdo → rodapé. Esquerda/Direita alterna sub-abas e move entre botões do rodapé. Para cima do conteúdo retorna à sub-aba ativa — nem sempre Voz. A aba de Idioma tem uma lista rolável adequada. O Readme recorre ao README do pacote AgentVibes quando nenhum local existe. Escape do instalador não fica mais travado.

---

## 🌟 v4.5 — Lançamento "Fale Todos os Idiomas"

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
