> 🌐 [English version](../../README.md)

**Autor**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Versão**: v5.2.1

---

## 🎯 NOVO NO v5.2.1 — Identidade Multi-LLM e Polimento de Instalação

- **Copilot recebe sua própria voz + pretexto + música** — "Copilot here" com bossa nova, totalmente distinto de Claude Code e Codex.
- **Configs MCP por ferramenta com identidade explícita** — `.vscode/mcp.json`, `.codex/config.toml`, `~/.copilot/mcp-config.json` cada um define seu próprio `AGENTVIBES_LLM`.
- **A ferramenta MCP `get_config` retorna o LLM detectado** — assistentes podem confirmar seu roteamento e responder com a voz certa.
- **Navegação do Setup: Instalar → Instalar → Instalar → Configurar → Configurar → Configurar** — o fluxo de teclado percorre as três Configurações antes de chegar em Padrão.
- **Música de fundo padrão do Claude Code** definida como Chillwave.
- **Refinamentos de compatibilidade com Linux** — CRLF, permissões, override de provedor de transporte.

## 🎯 NOVO NO v5.2.0 — Pré-visualização de Voz Remota + Modo Homem das Cavernas + Avaliações de Voz

- **Modo de verbosidade homem das cavernas** — Fragmentos TTS ultra-concisos. Configure via `/agent-vibes:verbosity caveman`.
- **👍/👎 avaliações de voz** — Pressione `+` para polegar para cima, `-` para polegar para baixo em qualquer lista de vozes. Substitui os favoritos com estrelas.
- **Pré-visualização de voz remota** — A pré-visualização de voz na TUI funciona em servidores headless via receptor SSH. Sem necessidade de áudio local.
- **Roteamento do receptor SSH** — `ssh-remote` e `agentvibes-receiver` são agora provedores de primeira classe.
- **Validação de vozes reforçada** — Formato multi-falante `::`, base64 multiplataforma, sem injeção de barra invertida.

---

## 🛡️ v5.1.4 — Reformulação de Resiliência TTS + Provedor LLM Padrão

- **Provedor LLM Padrão** — Nova entrada de fallback na parte inferior de Configuração → Provedores. Apenas config; abre o modal Configurar padrão. Usado quando uma ferramenta chama TTS sem identificar seu LLM.
- **Música de fundo por LLM ativa automaticamente** — Definir uma faixa de fundo no modal Configurar por LLM agora realmente a reproduz (sem precisar também ativar a música global).
- **Suporte ao Copilot CLI** — `installCopilotMcp` agora escreve tanto `.vscode/mcp.json` (Copilot Chat) quanto `~/.copilot/mcp-config.json` (Copilot CLI — produto diferente, caminho de configuração diferente).
- **Arquitetura de roteamento por cliente** — `.mcp.json` não define mais `AGENTVIBES_LLM`. Claude Code é auto-detectado via variável `CLAUDECODE=1`. Copilot CLI lê sua própria configuração global. Sem mais conflitos de configuração entre clientes.
- **Mutex TTS auto-reparável** — Quando um processo `play-tts.ps1` travado bloqueia a fila de reprodução, o próximo chamador o mata automaticamente (sem `taskkill` manual). Watchdog de 25 segundos garante progresso.
- **Sem mais reprodução de áudio velho** — `play-tts.ps1` captura o nome exato do arquivo de saída a partir do stdout do provedor em vez de adivinhar "`tts-*.wav` mais recente". Reprodução silenciosa de áudio antigo acabou.
- **Voz por LLM vence sobre `VoiceOverride` explícito** — LLMs devolvem resultados de `get_config` em cada chamada, o que sobrescrevia o roteamento por LLM. Corrigido.
- **`lessac-medium` → `lessac-high`** padrão para codex — Contorno de falha silenciosa de síntese.
- **Renomeação de arquivos scratch + codificação apenas ASCII** — Elimina arquivos de áudio compostos acumulados e erros de parsing CP1252 no Windows.
- **Confirmação de Configuração → Instalar** agora avança o foco para a próxima linha de provedor (fluxo Instalar → Instalar → Instalar).

---

## 🎙️ NOVO NO v5.1.0 — Reformulação do Seletor de Voz + Salvamento Automático no Modal do Agente

- **Salvamento automático no modal do agente** — Alterações de voz/personalidade/música/reverb/pretexto são salvas automaticamente enquanto você edita. Um breve aviso "✓ Salvo!" confirma cada alteração.
- **Nomes únicos para LibriTTS** — 904 falantes recebem sobrenomes determinísticos: **Anna Bell**, **Anna Carter**, …, **Anna Quinn**. Sem mais duplicatas "Anna-2", "Anna-3".
- **Símbolos de gênero rosa ♀ / azul ♂** — Indicadores de gênero coloridos na aba Vozes e em todos os modais do seletor de voz.
- **Salto rápido por primeira letra** — Pressione `a`–`z` em qualquer seletor de voz para saltar para aquela letra. `q`, `j`, `k`, `g`, `h`, `l` reservados para navegação/cancelar.
- **PgUp / PgDn / Home / End** nos seletores de voz
- **3 novas faixas de música de fundo** — Late Night Hip Hop Groove, Drifting Down the Hall, Midnight Charleston Stomp
- **Barra de pesquisa removida dos seletores de voz** — substituída pelo salto por primeira letra (mais rápido, sem problemas de foco)
- **Correção de corrupção na aba Vozes** — linhas não instaladas não perdem mais a coluna Provedor ao navegar sobre elas
- **Artefatos de piscada eliminados nas abas Música + Vozes**

---

## 🚀 v5.0.0 — Suporte Multi-Provedor: Claude Code + Copilot + Codex

- **GitHub Copilot + OpenAI Codex no VS Code** — AgentVibes agora suporta os três principais assistentes de codificação com IA. Instale e configure cada um pela TUI.
- **Uma aba de Configuração** — assistente de 4 passos (Idioma → Dependências → Motor TTS → Provedores) substitui as antigas abas de instalador + LLM. Usuários existentes pulam direto para Provedores.
- **Configuração de áudio por provedor** — cada LLM tem sua própria Voz, Motor TTS, Reverb, Música e Pretexto via modal Configurar.
- **Configurações redesenhadas** — lista plana e limpa: Idioma, Motor TTS, Voz, Verbosidade, Destino de Áudio, Armazenamento de Configuração, Re-executar Assistente.
- **Seletor de voz aprimorado** — exibição em 3 colunas, pré-visualização com barra de espaço, a rolagem permanece no lugar.

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
