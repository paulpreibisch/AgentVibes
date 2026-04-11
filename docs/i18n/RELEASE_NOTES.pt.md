> 🌐 [English version](../../RELEASE_NOTES.md)

## 🛡️ v5.1.4 — Reformulação de Resiliência TTS + Provedor LLM Padrão + Roteamento por Cliente

**Data de lançamento:** Abril 2026

Esta versão fecha um longo grupo de bugs em torno do roteamento TTS por LLM, reprodução de áudio paralelo, bloqueios por processos travados e reprodução de áudio antigo. Também adiciona uma nova entrada "Padrão" na aba de Configuração para áudio de fallback, e muda para um esquema de configuração por cliente que roteia corretamente Claude Code, GitHub Copilot (Chat + CLI) e OpenAI Codex para suas próprias vozes e pretextos.

### Novas Funcionalidades

- **Provedor LLM Padrão** — Nova entrada na parte inferior de Configuração → Provedores. Apenas config (sem botões de instalar/remover). Usado quando uma ferramenta chama TTS sem identificar seu LLM.
- **Música de fundo por LLM ativa automaticamente** — Definir uma `bg_track` em qualquer modal Configurar por LLM agora realmente a reproduz.
- **Suporte ao Copilot CLI** — `installCopilotMcp` agora escreve tanto `.vscode/mcp.json` (Copilot Chat) quanto `~/.copilot/mcp-config.json` (Copilot CLI — produto diferente).

### Arquitetura de Roteamento por Cliente

`.mcp.json` não define mais `AGENTVIBES_LLM`. O servidor MCP detecta automaticamente Claude Code via variável `CLAUDECODE=1`. Copilot CLI lê sua própria config global com `AGENTVIBES_LLM=copilot`. Codex lê `~/.codex/config.toml` com `AGENTVIBES_LLM=codex`. Sem mais conflitos de config entre clientes.

### Resiliência TTS (`play-tts.ps1`)

- **Mutex de reprodução entre processos** (`AgentVibesPlaybackLock`) serializa toda a reprodução de áudio.
- **Auto-reparação no timeout do mutex** — Mata automaticamente processos `play-tts.ps1` travados.
- **Watchdog de 25 segundos** garante progresso.
- **Captura exata do nome de arquivo** do stdout do provedor — sem mais reprodução de áudio antigo.
- **Voz por LLM vence sobre `VoiceOverride` explícito** de parâmetros MCP.
- **`lessac-medium` → `lessac-high`** padrão para codex (contorno de falha silenciosa de síntese).
- **Renomeação de arquivos scratch + codificação apenas ASCII** — Elimina arquivos compostos acumulados.

### Melhorias de UX

- **Confirmação de Configuração → Instalar** agora avança o foco para a próxima linha de provedor (fluxo Instalar → Instalar → Instalar).

### Como Atualizar

```
npm cache clean --force
npx --yes agentvibes@5.1.4
```

Re-execute o instalador em qualquer projeto existente para que a migração da config por cliente entre em vigor.

---

## 🎙️ v5.1.0 — Reformulação do Seletor de Voz + Salvamento Automático no Modal do Agente

**Data de lançamento:** Abril 2026

### Novas Funcionalidades

- **Salvamento automático no modal de edição de agente** — As alterações por agente de voz/personalidade/música/reverb/pretexto agora são salvas automaticamente enquanto você as edita. O botão Salvar explícito não existe mais; um breve aviso "✓ Salvo!" confirma cada alteração. Cancelar e Restaurar Padrões continuam funcionando como antes.

- **Nomes únicos para falantes do LibriTTS** — Os 904 falantes do LibriTTS não aparecem mais como "Anna", "Anna-2", "Anna-3", … "Anna-16". Cada um recebe um sobrenome determinístico de um pool de 16 nomes: **Anna Bell**, **Anna Carter**, **Anna Davis**, …, **Anna Quinn**. Os IDs de voz subjacentes não mudam, então as configurações de usuário existentes continuam funcionando.

- **Símbolos de gênero rosa/azul** — Vozes femininas mostram **♀** em rosa (magenta), masculinas mostram **♂** em azul claro (bright-cyan), desconhecido mostra `—`. A coluna `Gender` do cabeçalho é substituída por `♀/♂` colorido (10 → 4 caracteres de largura), liberando espaço para nomes mais longos. Aplicado à aba principal de Vozes E em todos os 3 modais do seletor de voz (Configuração, Agentes, Ajustes).

- **Salto rápido por primeira letra nos seletores de voz** — Pressione qualquer letra `a`–`z` para saltar para a primeira voz que começa com essa letra. As teclas reservadas (`q`, `j`, `k`, `g`, `h`, `l`) estão bloqueadas para manter seu significado de cancelar / navegação vi.

- **Navegação por página nos seletores de voz** — `PgUp`, `PgDn`, `Home`, `End` agora funcionam em todos os modais do seletor de voz.

- **3 novas faixas de música de fundo** — `Late Night Hip Hop Groove`, `Drifting Down the Hall` (vibes anos 90) e `Midnight Charleston Stomp` (swing). Contagem de faixas vai de 15 → 18.

### Melhorias

- **Barra de pesquisa do seletor de voz removida** — Substituída pelo salto por primeira letra. A antiga caixa de texto de pesquisa tinha problemas de foco que engoliam teclas de navegação. O salto é mais rápido para o caso típico "encontrar voz X".

- **Ordenação da lista de faixas corrigida** — Faixas com prefixos emoji (ex. `🎤 Late Night Hip Hop Groove`) agora são ordenadas pela parte alfabética do nome, não pelo codepoint do emoji. A ordem é consistente entre versões de Node/ICU.

- **Tecla de favorito agora é apenas `*`** — Removido o atalho duplicado `f` para marcar favoritos nos seletores de voz e na aba principal de Vozes. `f` agora está livre para o salto por primeira letra (ex. saltar para Frank ou Felix). O marcador `*` continua sendo a forma canônica de alternar favoritos.

### Correções de Bugs

- **Linhas não instaladas da aba Vozes não corrompem mais** — Selecionar uma voz não instalada estava deletando visualmente sua coluna Provedor devido a uma regex que combinava demais com o wrapper `bright-black-fg` da linha. Substituída por uma âncora de hint precisa que apenas remove o texto exato do hint.

- **Artefatos de piscada eliminados nas abas Música + Vozes** — Cursores `█` não deixam mais blocos residuais ao rolar rapidamente pela lista. Ambas as abas agora usam um helper preciso de remoção de piscada em vez do frágil cortador baseado em posição.

- **Aba Configuração não falha mais silenciosamente** — `_renderScreen3` envolvia todo o bloco de gravação `setupCompleted` em um único `try/catch {}` vazio. Arquivos de configuração local corrompidos agora são salvos como `config.json.bak` e reescritos, com erros logados em stderr — sem mais "preso repetindo a configuração" sem explicação.

- **Cancelamento `q` do seletor de voz agora funciona** — O novo salto por primeira letra estava engolindo `q` (e outras teclas de navegação vi). Lista de bloqueio de teclas reservadas adicionada.

- **Ordenação case-insensitive do seletor de faixas** — Novas faixas com nomes em Title Case (`Late Night Hip Hop Groove.mp3`) não saltam mais para o topo da lista acima das faixas em minúsculas `agent_vibes_*`.

### Impacto ao Usuário

- Editar a voz ou as configurações de um agente agora é mais rápido — sem precisar lembrar de clicar em Salvar
- O seletor de voz está dramaticamente menos poluído com os 904 falantes do LibriTTS tendo nomes únicos e amigáveis
- Gênero em um piscar de olhos via símbolos coloridos
- Três novas faixas musicais para variedade
- Artefatos de piscada/rolagem eliminados nas abas Vozes e Música

---

## 🚀 v5.0.0 — Suporte Multi-Provedor: Claude Code + Copilot + Codex

**Data de lancamento:** Abril 2026

### Novas Funcionalidades

- **Suporte ao GitHub Copilot no VS Code** — Instale e configure o AgentVibes para o GitHub Copilot diretamente pela TUI. Cria `.vscode/mcp.json` e `.github/copilot-instructions.md`.

- **Suporte ao OpenAI Codex no VS Code** — Integracao completa com Codex incluindo `.codex/config.toml`, protocolo TTS no `AGENTS.md` e hooks de inicializacao.

- **Aba de Configuracao Unificada** — O antigo assistente de instalacao de 5 telas e a aba separada de Provedores LLM foram mesclados em uma unica aba de Configuracao. A primeira execucao exibe um assistente de 4 etapas (Idioma → Dependencias → Motor TTS → Provedores); usuarios recorrentes pulam direto para a tela de Provedores.

- **Configuracao de Audio por Provedor** — Cada provedor LLM (Claude Code, Copilot, Codex) recebe seu proprio Motor TTS, Voz, Reverb, Musica de Fundo e Pretext atraves de um modal de Configuracao.

- **Tela de Selecao de Motor TTS** — Uma nova etapa do assistente mostra uma lista de motores adequada ao sistema operacional (Piper, Soprano, Windows SAPI, macOS Say) com botoes de Instalar para motores ausentes.

- **Aba de Configuracoes Redesenhada** — O layout de 5 sub-abas foi substituido por uma lista plana e limpa: Idioma da Interface, Motor TTS Padrao, Voz Padrao, Verbosidade, Destino de Audio, Armazenamento de Configuracao e Reexecutar Assistente de Configuracao.

### Melhorias

- **Seletor de voz aprimorado em todos os lugares** — Exibicao em 3 colunas (Nome, Genero, Provedor), pre-visualizacao com barra de espaco via sintese e reproducao, posicao de rolagem preservada durante a pre-visualizacao.

- **Artefatos de texto de dica corrigidos** — Mover-se entre linhas nas abas de Agentes e Musica nao deixa mais texto fantasma nas linhas anteriores.

- **Roteamento de voz do Codex corrigido** — `AGENTS.md` agora instrui o Codex a usar `play-tts` para fala normal e `bmad-speak` apenas durante o modo festa BMAD.

### Impacto para o Usuario

- AgentVibes agora funciona com Claude Code, GitHub Copilot E OpenAI Codex
- Experiencia de configuracao simplificada — uma unica aba para toda a gestao de provedores
- Personalizacao de voz por provedor sem editar arquivos de configuracao
- A pagina de configuracoes e drasticamente mais simples e rapida de navegar

---

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
