> 🌐 [English version](../../RELEASE_NOTES.md)

## 🎛️ v5.4.0 — Instalador TUI, Correção do Spinner e Limpeza de Dependências

**Lançamento:** 2026-04-22

### ✨ Novidades
- **Instalador TUI**: Interface de terminal interativa para instalação guiada — explore vozes, configure provedores, ative o modo festa BMAD, tudo a partir de uma bela interface de terminal
- **Correção do Spinner Multiplataforma**: Resolvido o crash `spinner.info is not a function` no WSL/Linux que bloqueava a instalação

### 🐛 Correções de Bugs
- **Removida dependência circular própria**: `package.json` dependia de `agentvibes@^3.5.9` (de si mesmo), fazendo com que o npm ocultasse o binário corrigido com o antigo com bugs — a causa silenciosa do crash do spinner em instalações repetidas
- **Restaurado o fallback de volume da música de fundo**: O fallback `bg_volume="0.20"` do `audio-processor.sh` perdido em um merge foi restaurado
- **Corrigida a detecção de PROJECT_ROOT em `play-tts.sh`**: A lógica de subida de diretórios ia 2 níveis a mais, fazendo com que o TTS usasse a configuração global `~/.agentvibes` em vez da configuração do projeto

### 🔧 Técnico
- 706/738 testes passando

---

## 🎯 v5.3.0 — Assuma o Controle das Vozes Remotas

**Data de Lançamento:** Abril 2026

Se você usa o AgentVibes para enviar anúncios de voz de um servidor
para seu celular, laptop ou outra máquina, esta versão coloca você no
comando. Cada chamada agora pode escolher sua própria voz, música de
fundo, frase de introdução, reverb, volume e velocidade — direto da
linha de comando, apenas para aquela mensagem.

### ✨ Novidades

#### Agora você pode personalizar cada anúncio individualmente

Antes, se você quisesse uma voz ou música diferente para uma mensagem
específica, tinha que alterar um arquivo de configuração (e lembrar de
voltar tudo como estava). Agora é só adicionar uma flag ao comando.

Quer que o Winston fale com seu sotaque britânico e jazz tocando ao
fundo para aquela notificação de deploy? Fácil:

```bash
bash .claude/hooks/play-tts-ssh-remote.sh \
  --text "Deploy complete" \
  --voice "en_US-ryan-high" \
  --pretext "Winston here" \
  --music "Late Night Hip Hop Groove.mp3" \
  --volume 0.25
```

Qualquer coisa que você não especificar cai de volta nas suas
configurações normais. Quer pular a frase de introdução só dessa vez?
Passe `--pretext ""` e ele fica silencioso antes da mensagem.

**Flags disponíveis:**
- `--voice` — qual voz Piper usar
- `--pretext` — a frase de introdução antes da mensagem (passe `""` para pulá-la)
- `--music` — faixa de música de fundo (nomes de arquivo com espaços agora funcionam!)
- `--volume` — quão alta é a música de fundo (0.0 a 1.0)
- `--effects` — cadeia de efeitos sonoros como reverb
- `--speed` — quão rápido a voz fala
- `--provider` — qual motor TTS usar
- `--agent` — qual personalidade de agente usar

A forma antiga de chamar o script ainda funciona, então nada que você
já configurou vai quebrar.

### 🛠 Correções de Confiabilidade

- **Mensagens longas e caracteres especiais não são mais cortados.** No
  Windows, anúncios longos ou textos com aspas, apóstrofos ou emoji
  estavam ficando distorcidos antes de chegarem ao motor de voz.
  Corrigido — sua mensagem agora chega exatamente como você enviou,
  não importa quão longa ou estranha.

- **Anúncios de voz agora funcionam em servidores Windows sem monitor.**
  O Windows se recusa a tocar áudio na sessão de "serviço" que o SSH
  normalmente usa. Um pequeno auxiliar em segundo plano agora roda na
  sua sessão de usuário normal e recolhe anúncios de uma fila, então o
  áudio toca corretamente mesmo em servidores headless.

- **A pré-visualização de voz na TUI funciona em servidores remotos.**
  Antes, se você pré-visualizasse uma voz de um servidor sem
  alto-falantes, ele tentava tocar localmente (e falhava). Agora ele
  transmite corretamente para qualquer dispositivo remoto que você
  tenha configurado.

- **Sem mais frases de introdução duplicadas.** Se você configurasse um
  pretexto tanto no servidor emissor quanto na máquina receptora,
  costumava ouvi-lo duas vezes. A versão do remetente vence agora — o
  receptor não adicionará a sua por cima.

- **Configurações de streaming remoto agora realmente permanecem.** Uma
  mudança recente acidentalmente fez com que configurações de streaming
  remoto (`ssh-remote`, `agentvibes-receiver`) fossem sobrescritas e
  caíssem de volta na reprodução local. Corrigido.

- **Anúncios longos não são mais mortos no meio da frase.** O timeout
  de segurança que para áudios travados era agressivo demais para
  mensagens longas. Agora está generoso o suficiente para lidar com
  anúncios do tamanho de um parágrafo.

- **Estado do instalador mais limpo** — quando você instala o
  AgentVibes para Claude Code, ele agora escreve seu arquivo de
  provedor TTS explicitamente em vez de depender de estado implícito.

### 🧪 Testes

55 novos testes garantem que o modo festa BMAD continue funcionando:
cada agente recebe sua voz e música únicas, os agentes não compartilham
acidentalmente o mesmo ID de falante Piper, e o instalador sempre
aponta o modo festa para o ponto de entrada multiplataforma.

---

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
