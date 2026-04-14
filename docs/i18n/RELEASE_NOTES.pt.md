> 🌐 [English version](../../RELEASE_NOTES.md)

## 🎯 v5.2.1 — Identidade Multi-LLM e Polimento de Instalação

**Data de Lançamento:** Abril 2026

Roteamento LLM polido para Copilot/Codex e experiência de configuração refinada.

### ✨ Novidades

#### Roteamento de Identidade Multi-LLM

- **GitHub Copilot agora tem sua própria voz, pretexto e música de fundo** — totalmente distinto de Claude Code e Codex. Diga olá ao "Copilot here" ao som de bossa nova.

- **Configs MCP por ferramenta com identidade explícita** — cada ferramenta de IA (`.vscode/mcp.json`, `.codex/config.toml`, `~/.copilot/mcp-config.json`) define seu próprio `AGENTVIBES_LLM` para roteamento determinístico.

- **A ferramenta MCP `get_config` agora retorna o LLM detectado** — o assistente chamador pode confirmar seu roteamento e responder com a voz certa desde o início.

- **Refinamentos de compatibilidade com Linux** — finais de linha CRLF, permissões e manuseio de override de provedor de transporte.

#### Melhorias no Fluxo de Setup

- **Fluxo de navegação por teclado** — pressionar Enter nos botões Instalar (Claude → Copilot → Codex) agora salta para **Configurar Claude**, permitindo percorrer as três opções de Configurar antes de chegar em Padrão.

- **A seta para baixo pula a linha Padrão** nas colunas Instalar/Remover.

- **Mensagens de sucesso parcial de instalação** — se as cópias de arquivo tiverem sucesso mas a config MCP precisar de um empurrão, você verá um aviso claro em vez de uma falha genérica.

#### Padrões

- **Música de fundo padrão do Claude Code** definida como Chillwave (`agent_vibes_chillwave_v2_loop.mp3`).

#### Por Baixo do Capô

- Validação de chave LLM reforçada para manuseio mais seguro de variáveis de ambiente.
- Registro de erros melhorado para casos extremos de gravação de config Copilot CLI.
- Limitação conhecida documentada: se você iniciar o VS Code a partir de um terminal iniciado pelo Claude Code, `CLAUDECODE=1` pode vazar — a solução é `unset CLAUDECODE` primeiro.

---

## 🎯 v5.2.0 — Pré-visualização de Voz Remota + Modo Homem das Cavernas + Avaliações de Voz

**Data de lançamento:** Abril 2026

Esta versão adiciona suporte à pré-visualização TTS remota, um novo modo de verbosidade ultra-conciso e avaliações de polegar para cima/baixo para vozes em toda a TUI.

### Novas Funcionalidades

- **Modo de verbosidade homem das cavernas** — Novo nível de verbosidade `caveman` para saída TTS ultra-concisa. Fragmentos em vez de frases. Configure via `/agent-vibes:verbosity caveman` ou a ferramenta MCP `set_verbosity`. Baixa automaticamente uma voz em uma nova instalação se nenhuma estiver presente.

- **Avaliações de polegar para cima/baixo para vozes** — Substitui os antigos favoritos com estrelas por avaliações 👍/👎. Pressione `+` para polegar para cima, `-` para polegar para baixo tanto na aba Vozes quanto no seletor de voz (aba Configuração). As avaliações persistem entre sessões e são compartilhadas entre todas as interfaces de seleção de voz.

- **Pré-visualização de voz remota** — A pré-visualização de voz na aba Vozes da TUI, seletor de voz e navegador de vozes agora funciona em servidores headless. Quando o provedor ativo é `ssh-remote` ou `agentvibes-receiver`, a pré-visualização é roteada via `play-tts.sh` para reproduzir áudio no receptor remoto em vez de exigir Piper + player de áudio local. Consciente da plataforma: usa PowerShell no Windows, bash no Linux.

- **Roteamento do provedor receptor SSH** — `ssh-remote` e `agentvibes-receiver` são agora provedores de primeira classe em `play-tts.sh`. Tanto a função `speak_text()` quanto a instrução case de roteamento principal os suportam, eliminando erros "Unknown provider".

### Correções

- **Correção automática de nomes de falantes LibriTTS** — O download de vozes agora corrige automaticamente os nomes de falantes LibriTTS para que vozes multi-falante funcionem corretamente desde o início.
- **Expressão regular de validação de vozes reforçada** — O regex do parâmetro VOICE agora permite `::` (multi-falante), `.` (locale) e espaços (nomes de falantes) sem aceitar barra invertida (risco de injeção). Modelos de receptor Linux e Windows atualizados para corresponder.
- **Compatibilidade multiplataforma de `base64`** — Detecta GNU `base64 -w 0`, recorre a BSD `-b 0`, depois a `tr -d '\n'`. Corrige o abort do script em sistemas macOS/BSD.
- **Correção do duplo processamento de efeitos de áudio** — `play-tts-piper.ps1` ignora sua própria chamada ao processador de áudio quando `AGENTVIBES_NO_PLAY` está definido.
- **Correção de vazamento de código de saída** — `play-tts.ps1` agora sai explicitamente com código 0.
- **Suporte de plataforma Windows na aba do receptor** — Detecção de IP do Tailscale, IP local via PowerShell, leitura de sshd_config e cópia para a área de transferência funcionam nativamente no Windows.
- **Linha de efeitos de áudio `llm:default`** — Uma nova linha padrão garante que os receptores remotos obtenham reverb, música e pretexto.
- **Texto de amostra de pré-visualização** — Alterado para evitar um defeito de pronúncia do Piper.
