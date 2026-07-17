> 🌐 [English version](../../RELEASE_NOTES.md)

## 🔧 v5.13.1 — Atualizações do Windows que realmente atualizam

**Lançamento:** 2026-07-16 · no `latest` — `npm install agentvibes@latest`

### 🪟 Seus scripts do Windows agora realmente atualizam

No Windows, os pequenos scripts que fazem seus agentes falarem vivem na sua pasta `.claude/hooks`. Atualizar dizia que os renovava — mas no Windows, silenciosamente, isso não acontecia, então eles podiam ficar presos na versão que você instalou pela primeira vez durante meses.

Agora eles realmente atualizam. Rode `npx agentvibes update` e você vai receber cada correção que estava perdendo. Tudo que você mesmo personalizou continua seguro ao lado, como um arquivo `.user.bak`, exatamente como antes.

Se você usa macOS ou Linux, nada muda — as atualizações já funcionavam bem para você.

### 🔒 Um ajuste de segurança nos bastidores

Atualizamos uma das peças que o AgentVibes usa para ler arquivos de configuração. Um arquivo de configuração especialmente manipulado poderia fazer com que ele travasse. Nunca foi possível roubar ou espionar nada — mas agora ele também não consegue mais travar. Você não precisa fazer nada; já está incluso.

---

## 🎉 v5.13.0 — Suas Vozes em Todo Lugar, Com um Aviso

**Lançamento:** 2026-07-16 · no `latest` — `npm install agentvibes`

Novidades:

### 🖥️ Use as vozes do seu próprio computador, de qualquer lugar
Roda seus agentes em uma máquina e escuta em outra? Agora você pode escolher as vozes integradas do **Windows** (David, Zira, Mark) ou do **Mac** e ouvi-las bem onde você está sentado. O AgentVibes mostra todas as vozes e marca claramente aquelas que o seu dispositivo de escuta consegue reproduzir.

### 🗂️ Todas as suas vozes em uma lista organizada
Piper, Kokoro, ElevenLabs, Windows, Mac, Soprano — cada voz agora vem de uma única lista, então o que você vê é sempre o que você pode usar.

### 🔔 Um toque de "aviso" antes do som tocar
Logo antes de uma fala ou pré-visualização de música começar, você ouve um toque curto — então você sempre sabe que o áudio está a caminho, mesmo que leve um instante.

### 🎵 As pré-visualizações de música seguem o seu som
Pré-visualize uma faixa e ela toca onde quer que o seu áudio esteja configurado para ir — inclusive em outro computador.

### 🆔 Agentes que se apresentam
Ative as autoapresentações e cada agente diz quem é ao iniciar — útil quando uma equipe inteira está falando.

### 🛟 Suas próprias edições ficam seguras quando você atualiza
Mexeu em algum dos arquivos do AgentVibes na sua pasta `.claude/hooks`? A partir desta versão, atualizar nunca mais vai jogar fora o seu trabalho. Se precisarmos atualizar um arquivo que você alterou, guardamos a sua cópia bem ao lado, com `.user.bak` no final — algo como `play-tts.sh.user.bak`.

**Esse arquivo é criado pelo AgentVibes — nada está quebrado e mais ninguém o colocou ali.** É simplesmente a sua versão antiga, guardada para você dar uma olhada ou copiar suas mudanças para a nova. Apague quando não precisar mais dele.

Se você personalizou arquivos em uma versão mais antiga, vale a pena dar uma olhada rápida em `.claude/hooks` para ver se há algo que você queira recuperar.

### ✨ Mais vozes, uma experiência mais suave
- Vozes do **ElevenLabs** totalmente suportadas
- Mais vozes do **Kokoro**, funcionando muito bem no Windows
- Configuração mais rápida e confiável no Windows
- **3.261 testes automatizados passando** — estável e confiável

---

## 🎉 v5.12.0 — A Reforma da Semana Fable (Estável)

**Lançamento:** 2026-07-05 · agora no `latest` — `npm install agentvibes`

Isto transforma o alfa da "Semana Fable" em um lançamento estável. Durante uma semana de acesso antecipado ao novo modelo **Fable** da Anthropic, nós o direcionamos a toda a base de código do AgentVibes e reconstruímos o núcleo de forma adequada.

### Um núcleo mais forte e compartilhado

Toda vez que o AgentVibes fala, ele toma muitas decisões — qual voz, qual motor, se deve reproduzir aqui ou enviar o áudio para outra máquina, música de fundo, volume, mudo. Essa lógica havia sido copiada em vários scripts separados (Mac/Linux, Windows, remoto e o servidor de voz), e as cópias lentamente **divergiram** — uma correção em uma passava despercebida nas outras, e é por isso que certas falhas continuavam voltando.

Substituímos tudo isso por **um único núcleo compartilhado** que toda parte do AgentVibes agora segue — um só lugar para corrigir, um só lugar para confiar. O que você vai notar:

- **Vozes Kokoro que ficavam mudas no Linux agora funcionam em todos os lugares.**
- **Suas escolhas de voz permanecem** — as configurações não são mais silenciosamente sobrescritas.
- **Volume, mudo e reprodução remota se comportam da mesma forma** no Mac, Linux e Windows.
- **Seguro por padrão** — se o novo núcleo não estiver disponível na sua máquina, o AgentVibes recorre ao comportamento antigo, de modo que nunca simplesmente para de falar.

### As pré-visualizações agora tocam no lugar certo

Pré-visualizar uma voz ou faixa costumava tocar em qualquer máquina em que você estivesse — o que ficava mudo se você tivesse configurado o AgentVibes para enviar seu áudio para outro lugar. Agora:

- **Se você tiver o SSH remoto configurado, as pré-visualizações tocam no seu receptor; caso contrário, tocam localmente, como antes.**
- Isso abrange **pré-visualizações de voz** (Piper e Kokoro) das telas de Setup, Agente e Configurações, e **pré-visualizações de música/faixa** — pressione Espaço para tocar, Espaço novamente para parar.

### Um menu de vozes mais simples

- **Removemos a aba redundante de Vozes.** Ela só listava vozes do Piper e confundia as pessoas, já que a escolha de uma voz para qualquer provedor já fica em **Setup**.

### Base para o que vem a seguir

- O receptor agora também recebe o **caminho completo da pasta do projeto** de onde uma mensagem veio (um novo campo `projectPath`, ao lado do nome do projeto que ele já recebia) — estabelecendo a base para melhorias futuras.

### Revisado antes de lançar

Executamos três revisões independentes sobre as mudanças — segurança, correção e regressões — e corrigimos cada problema real antes do lançamento.

## 🎸 v5.8.0 — Soprano Agora Funciona + Seletor de Voz Corrigido para Todos os Motores

**Lançamento:** 2026-05-18

### 🐛 Soprano TTS Estava Quebrado — Agora Corrigido

Soprano (nosso motor de TTS neural com 80M de parâmetros, introduzido na v5.6) falha silenciosamente no Windows. Vários problemas combinados o quebravam de ponta a ponta:

- O seletor de voz do Windows mostrava o Soprano como opção, mas o iniciava com o nome de binário errado (`soprano-tts` em vez de `soprano`)
- `play-tts-soprano.ps1` era chamado pelo Node.js com um PATH reduzido, de modo que os executáveis `soprano` e `soprano-webui` não podiam ser encontrados mesmo que instalados
- O caminho do arquivo wav era escrito no stream de Informação do PowerShell (`Write-Host`) em vez de stdout, então o processador de reverb/música de fundo não conseguia encontrá-lo
- O Gradio WebUI nunca iniciava automaticamente — era necessário executar `soprano-webui` manualmente antes de cada sessão

Todos esses problemas estão agora corrigidos. AgentVibes detecta automaticamente se o servidor WebUI do Soprano está rodando na porta 7860, inicia-o se não estiver, e aguarda até que esteja pronto (até 90 segundos). Três modos funcionam em ordem de prioridade: WebUI (mais rápido — modelo permanece carregado) → API compatível com OpenAI → CLI `soprano` direto.

### 🐛 O Seletor de Voz Ignorava Windows SAPI e macOS Say

Ao abrir o seletor de voz para um LLM configurado para usar **Windows SAPI** ou **macOS Say**, o seletor exibia a lista completa de vozes do Piper em vez da voz embutida do motor. Isso era confuso — selecionar uma voz do Piper ao usar SAPI ou macOS Say não tinha efeito, e a pré-visualização com a barra de espaço tocava através do motor errado.

O seletor agora se adapta ao motor selecionado:

- **Windows SAPI / macOS Say / Soprano:** mostra exatamente um item (a voz embutida do motor), seleciona-o automaticamente, e a pré-visualização com a barra de espaço fala através do binário correto do motor
- **Piper:** mostra o catálogo completo de vozes instaladas como antes

Além disso, salvar a configuração não sobrescreve mais silenciosamente o campo `ttsEngine` para `piper` quando um motor nativo está em uso.

### 🔒 Confiabilidade do Soprano (9 Correções de Revisão Adversarial)

- **Correção de crash:** `destroy()` no socket poderia emitir um evento `error` tardio sem listener, causando crash no processo Node.js — um handler absorvedor está agora em vigor
- **Cancelamento de loop:** o loop de polling do WebUI de 90 segundos agora para imediatamente quando o modal ou seletor de voz é fechado (via AbortController)
- **Sem rejeições não tratadas:** handlers `.catch()` adicionados a todas as chamadas async de verificação do WebUI
- **Sem processos duplicados:** um cooldown de 10 segundos evita iniciar duas instâncias de `soprano-webui` ao clicar rapidamente em Pré-visualizar
- **Melhor feedback de erros:** falhas de spawn e códigos de saída não nulos agora mostram um label de erro visível no seletor de voz
- **PATH preservado:** a atualização do PATH no PowerShell agora acrescenta entradas do registro em vez de substituir todo o PATH, para que os shims do nvm, conda e pyenv continuem funcionando

---

## 🎭 v5.7.7 — Restauração de Vozes no Modo Party + Melhorias

**Lançamento:** 2026-05-17

### 🐛 Agentes do Modo Party Silenciosos (Sem TTS por Agente)

Os agentes do modo party exibiam respostas em texto mas não as liam com suas vozes únicas. Duas causas raiz:

**Desambiguação do skill:** `/party-mode` correspondia ao comando BMAD `_bmad/core/workflows/party-mode` (que tenta carregar um caminho inexistente neste projeto) em vez do skill do AgentVibes. Uma substituição de comando `/party-mode` local ao projeto agora encaminha para o skill correto.

**Etapa TTS obrigatória:** A etapa de chamada `bmad-speak.js` do orquestrador estava mal especificada e às vezes era ignorada. A Etapa 4 no skill do modo party BMAD agora está claramente marcada como OBRIGATÓRIA, com documentação explícita do que `bmad-speak.js` aplica por agente: voz, pretext, reverb, personalidade e música de fundo — tudo carregado automaticamente de `~/.agentvibes/bmad-voice-map.json`.

### 🔍 Registro de Diagnóstico para Modo Party

`bmad-party-speak.sh` (hook PostToolUse) agora escreve entradas de diagnóstico estruturadas em `/tmp/agentvibes-party-debug.log` — `fired`, `fingerprint HIT/MISS`, `invoking` e erros — para que problemas de voz sejam diagnosticáveis sem adivinhação.

### 🎵 Nova Faixa Incluída: CelestialVelvet

Uma nova faixa de música ambiente **CelestialVelvet** (🌌) foi adicionada ao catálogo integrado. Disponível imediatamente no seletor de música TUI e no mapa de vozes BMAD — sem download necessário.

### 🐛 TUI: Texto Cinza em Linhas Selecionadas Corrigido

O texto branco agora é exibido corretamente nas linhas selecionadas nas abas Vozes e Agentes. Anteriormente, o primeiro plano `bright-black` combinado com fundo verde produzia texto cinza ilegível em muitos terminais.

### 🐛 SSH Remoto: Erro "wait: pid is not a child of this shell"

`play-tts-ssh-remote.sh` emitia `wait: pid X is not a child of this shell` em certos shells. Corrigido iniciando `ssh` diretamente dentro do subshell em segundo plano para que `$?` capture o código de saída sem uma chamada `wait` entre shells.

---

## 🔧 v5.7.6 — Integridade do Payload SSH Remoto + Reescrita do Receptor

**Lançamento:** 2026-05-16

### 🐛 SSH Remoto Reproduzindo Música e Voz Incorretas

Ao usar o recurso TTS SSH remoto, a faixa de música e a voz do projeto errado estavam sendo aplicadas. Causa raiz: `CLAUDE_PROJECT_DIR` não era encaminhado ao emissor, fazendo-o usar a configuração global em vez do `audio-effects.cfg` do projeto ativo.

### 🐛 Receptor Bash Incompatível com o Formato de Payload JSON

O receptor bash Linux/Termux (`agentvibes-receiver.sh`) usava um formato de argumento posicional anterior à v5.5 e não conseguia decodificar o payload base64 JSON atual de forma alguma. O receptor foi completamente reescrito para corresponder à lógica do receptor PowerShell: decodifica base64, analisa JSON, aplica voz/música/efeitos/volume e valida todos os campos.

### 🐛 Introdução de Personalidade Ouvida Duas Vezes no Remoto

O pretext de personalidade (ex., "Bcs latin dance here") estava sendo falado duas vezes ao usar TTS SSH remoto. Causa raiz: `play-tts.sh` já adiciona o pretext ao texto de fala antes de chamar o emissor; o emissor também o colocava no campo JSON `pretext`, fazendo o receptor adicioná-lo novamente. O campo JSON `pretext` agora é intencionalmente deixado vazio — a personalidade é entregue apenas pelo campo `text`.

### 🆕 Alias de Host SSH Visível na Aba de Configurações

O alias de host SSH remoto configurado agora é exibido nas abas Configurações e Vozes para que os usuários possam confirmar qual máquina remota o TTS está direcionando sem abrir arquivos de configuração.

### 🔒 Correções de Segurança

Melhorias de validação de entrada no emissor e receptor SSH remoto.

### 🧪 24 Novos Testes BATS

- 15 testes de payload SSH remoto: verificam voz, faixa de música, volume, reverb/efeitos, tratamento de pretext, identificador LLM, precedência de configuração do projeto e validade JSON
- 9 testes de viagem de ida e volta de ponta a ponta: o emissor constrói o payload → o receptor decodifica e aplica todos os campos simultaneamente, detectando regressões em ambas as extremidades

---

## 🖥️ v5.7.5 — Contraste dos Botões TUI + Correções de Roteamento BMAD

**Lançamento:** 2026-05-13

### 🐛 Foco dos Botões TUI: Texto Cinza Eliminado em Todos os Terminais

Botões focados e selecionados na TUI exibiam texto cinza claro sobre fundos azul claro em muitos terminais. Causa raiz: `bold: true` combinado com uma cor de primeiro plano escura ativa o "modo brilhante" do terminal, renderizando a cor como cinza independentemente do tom exato.

**Correção:** Todos os estados de foco dos botões agora usam **texto branco sobre fundo verde escuro (`#2e7d32`)** — o mesmo padrão de alto contraste já usado pela aba Agentes. Manipuladores explícitos de `focus`/`blur` foram adicionados aos botões modais do setup-tab para evitar que `attachBtnBlink` interfira na aplicação de cores `style.focus` passivo do blessed.

### 🐛 Indicador ♪ do Seletor de Voz na Aba BMAD Não Aparecia

O indicador ♪ de pré-visualização na lista de vozes da aba BMAD não aparecia durante a pré-visualização. A aba Agentes estava sem as chamadas `_refreshVP()` que a aba Configurações já tinha. Um temporizador de exibição mínimo de 2 segundos mantém o indicador visível quando o SSH-remoto termina imediatamente (modo fire-and-forget).

### 🐛 Instalação Não Interativa: Pretext Genérico em Vez do Nome do Projeto

Executar `agentvibes install` de forma não interativa sempre definia o pretext como `"Claude Code here"` independentemente do projeto. O instalador agora deriva um pretext ciente do projeto a partir de `path.basename(process.cwd())` com capitalização (ex., `"MyProject here"`), com fallback seguro para caminhos raiz do Docker.

### 🐛 Pretext Global Sobrescrevendo a Configuração por Projeto

`seedAllLlmDefaultsSync` populava as linhas LLM no nível do projeto com a string de pretext global, fazendo o `"Claude Code here"` global sobrescrever os valores de `tts-pretext.txt` por projeto. As linhas no nível do projeto agora são populadas com pretexts vazios para que o arquivo por projeto tenha precedência.

### 🐛 Variante TERM `screen`/`tmux` Causava Erro de Capacidade `plab_norm`

Quando `TERM` era definido como variante `screen-*` ou `tmux-*`, blessed lançava um erro de capacidade de terminal `plab_norm` ao iniciar. O app agora substitui `TERM` por `xterm-256color` antes de criar a tela blessed quando tal variante é detectada.

### 🐛 Música/Reverb por Agente BMAD Não Chegava ao Receptor SSH

`play-tts.sh` não encaminhava `AGENT_PROFILE_FILE` ao transporte remoto SSH, então as substituições de música de fundo e reverb por agente na aba BMAD eram silenciosamente ignoradas para áudio remoto. O caminho do arquivo de perfil agora é passado como argumento 4 para `play-tts-ssh-remote.sh`.

### 🐛 Compatibilidade Node 18: `import.meta.dirname` Substituído

Um arquivo de teste usava `import.meta.dirname`, disponível apenas no Node 21+. Substituído pelo padrão `fileURLToPath(import.meta.url)` para que os testes sejam executados corretamente no Node 18 e 20.

---

## 🎭 v5.7.0 — Suporte a BMAD v6.6 + Reinício Automático do Watcher no Windows

**Lançamento:** 2026-05-11

### 🆕 Compatibilidade com BMAD v6.6.0

O BMAD v6.6 reestruturou onde os agentes ficam — eles foram movidos de `_bmad/bmm/agents/` para `.claude/skills/*/agents/`. O AgentVibes agora detecta e escaneia esses novos caminhos corretamente.

**A injeção de TTS** ignora graciosamente os agentes v6.6+ (que usam Markdown simples sem seções de ativação XML/YAML) em vez de lançar erros. O resumo de instalação agora indica claramente quantos agentes foram ignorados vs. modificados.

**A detecção na aba BMAD** agora encontra BMAD instalado globalmente em `~/_bmad` (instalação no diretório home) além das instalações locais do projeto. Anteriormente, a aba BMAD mostrava "Não detectado" mesmo quando o BMAD estava instalado globalmente.

**Segurança:** A validação de caminhos do instalador agora permite corretamente caminhos BMAD sob o diretório home do usuário, corrigindo um falso positivo de "Caminho BMAD inválido" para instalações globais.

### 🆕 Watcher de TTS para Windows — Arquivo Independente + Reinício Automático

`tts-watcher.ps1` agora é extraído como arquivo independente em `~/.agentvibes/tts-watcher.ps1`. Executar `npx agentvibes update` agora copia o watcher mais recente **e** o reinicia automaticamente — tanto o arquivo quanto o processo são atualizados em um único passo, sem reinício manual necessário.

### 🐛 Substituição de Provedor do Windows Respeitada no Laptop

`play-tts.ps1` agora lê a configuração `ProviderOverride` da configuração do lado Linux ao receber áudio via SSH. Anteriormente, o laptop sempre usava seu provedor configurado localmente mesmo que o servidor especificasse um diferente.

### 🐛 Comando Sample Adicionado ao Gerenciador de Voz

`voice-manager.sh sample` não tinha seu manipulador — ao chamá-lo, caía silenciosamente no caminho de uso/saída. Corrigido.

### 🐛 O Roteamento SSH de Pré-visualização Detecta o Endpoint Correto

`provider-manager.sh` agora inclui `detect_routing_llm()` que verifica `AGENTVIBES_LLM_KEY` e depois `transport-config.json` para a primeira entrada `mode=remote`, para que o áudio de pré-visualização chegue ao host SSH correto.

---

## 🔇 v5.6.9 — Reverb e Música de Fundo Silenciosos em Instalações NPX

**Lançamento:** 2026-05-09

### 🐛 Reverb e Música de Fundo Silenciosamente Quebrados para Todos os Usuários NPX

Quando o AgentVibes é instalado via `npx`, os arquivos de hook são extraídos do pacote com permissões 644 — sem bit de execução. `play-tts-piper.sh` chamava `audio-processor.sh` diretamente, que sai imediatamente com código 126 (Permissão negada) em um arquivo não executável. Todos os usuários instalados via `npx` recebiam TTS apenas de voz — sem reverb, sem música de fundo, silenciosamente.

**Correção 1:** `play-tts-piper.sh` agora chama `audio-processor.sh` via `bash "$SCRIPT_DIR/audio-processor.sh"`, ignorando a verificação do bit de execução.
**Correção 2:** `install-deps.js` (postinstall) agora executa `ensureHookPermissions()` para fazer `chmod 755` em todos os arquivos `.sh` após o npm install.

### 🐛 Pré-visualização do Navegador de Voz Ignorava Reverb e Música de Fundo

O botão **Pré-visualização** no Navegador de Voz reproduzia saída bruta do piper sem reverb nem música de fundo, ignorando completamente `audio-processor.sh`.

**Correção:** O áudio de pré-visualização agora passa pelo mesmo pipeline `audio-processor.sh` que o TTS real.

### 🐛 O MCP `text_to_speech` Retornava Caminho de Arquivo Corrompido e Informações de Voz Ausentes

A ferramenta extraía o caminho do arquivo de áudio incorretamente (incluindo caracteres de tamanho/emoji no final) e nunca reportava o nome da voz em sua resposta.

**Correção:** Os códigos ANSI são removidos antes da análise, o caminho `.wav` é extraído corretamente, e a linha `🎤 Voz utilizada:` é incluída na resposta da ferramenta.

### 🐛 Toggle de Música de Fundo na TUI Não Tinha Efeito

Ativar música de fundo na aba **Música** escrevia em `config.json` mas não em `background-music-enabled.txt` (lido pelos hooks bash). A música permanecia desativada após o toggle. Salvar uma faixa agora também implica ativar a música.

---

## 🐧 v5.6.8 — Roteamento de Voz no WSL Corrigido + Confiabilidade do Ciclo de Vida da Sessão

**Lançamento:** 2026-05-09

### 🐛 WSL: A Voz Configurada Agora É Reproduzida (Sem Fallback para Lessac)

Em sessões WSL, o AgentVibes reproduzia `en_US-lessac-medium` independentemente da voz configurada. Causa raiz: o `pipx` instala o Piper em `~/.local/bin/`, que shells interativos obtêm via `.bashrc`/`.zshrc`, mas as chamadas de ferramenta Bash do Claude Code são executadas de forma não interativa e ignoram o carregamento de perfil — `command -v piper` falhava, recorrendo à voz padrão.

**Correção:** `play-tts-piper.sh` agora adiciona `~/.local/bin` e o bin do venv Piper do pipx ao início do `PATH` antes da verificação do binário, de modo que o Piper é encontrado independentemente do modo do shell.

### 🐛 Voz/Música por Projeto Perdida Quando `CLAUDE_PROJECT_DIR` Não Está no Ambiente Bash

Quando o Claude Code executa uma chamada de ferramenta Bash, `CLAUDE_PROJECT_DIR` não é passado no ambiente. Os hooks de TTS não conseguiam encontrar a configuração por projeto e recorriam aos padrões globais — voz errada, música errada, sem pretexto.

**Correção:** `session-start-tts.sh` (e `.ps1`) agora incorpora o diretório do projeto no comando hook injetado como `--project-dir`. `play-tts.sh` lê este sinalizador antes de qualquer busca de configuração, tornando o roteamento por projeto confiável em cada chamada de ferramenta Bash.

### 🐛 `play-tts-piper.sh` e `play-tts-piper.ps1` Não Implantados por `agentvibes install`

Esses hooks estavam ausentes de `CRITICAL_HOOKS` / `CRITICAL_HOOKS_WINDOWS`, então `agentvibes install` nunca propagava versões atualizadas para `~/.claude/hooks/`.

**Correção:** Ambos estão agora na lista de hooks críticos e sempre são implantados na instalação/atualização.

### 🐛 Bugs no Nome de Exibição da Voz

- `uniquifyVoiceName("Mary-1")` retornava `"Mary-1 Bell"` em vez de `"Mary Bell"`.
- Nomes do 16Speakers como `Rose_Ibex` recebiam incorretamente um sobrenome adicionado (`"Rose Ibex Bell"`).
- A linha `🎤 Voice used:` estava ausente da saída bash do WSL.

Os três foram corrigidos. Um novo arquivo de testes (`test/unit/voice-names.test.js`, 16 testes) cobre esses casos.

---

## 🪟 v5.6.7 — Pré-visualização no Windows Corrigida

**Lançamento:** 2026-05-08

### 🐛 O Botão de Pré-visualização Agora Funciona Corretamente no Windows

Ao configurar o áudio por LLM no Windows, clicar em **Pré-visualização** reproduzia a voz errada (usando por padrão o Windows SAPI) sem música de fundo ou reverb. Agora reproduz exatamente a voz, o reverb e a faixa de fundo que você configurou.

### 🧪 Testes de Regressão Adicionados

Dois novos testes CI do Windows verificam a busca de configuração de pré-visualização — assim, isso não pode regredir silenciosamente em uma versão futura.

---

## 🔇→🎵 v5.6.6 — Pré-visualização de Música de Fundo Corrigida para npm link e Instalações Globais

**Lançamento:** 2026-05-08

### 🐛 Música de Fundo Silenciosamente Ausente da Pré-visualização (npm link / Instalação Global)

Quando você clicava em **Pré-visualização** no modal de configuração do LLM com uma faixa de fundo definida, você ouvia apenas a voz — sem música —, a menos que o AgentVibes estivesse instalado como dependência local. Corrigido independentemente de como você instala o AgentVibes.

**Causa raiz:** Em instalações via `npm link` e globais, um script de sincronização usando `rsync --delete` apagava periodicamente `background-music-enabled.txt` do diretório do pacote porque o arquivo é gitignored. Após a exclusão, `audio-processor.sh` recorria a uma configuração global com a música desativada — silêncio.

**Correção:** `audio-processor.sh` agora verifica **primeiro** `CLAUDE_PROJECT_DIR/.claude/config/background-music-enabled.txt`. A pré-visualização da TUI também grava o sinalizador no diretório do projeto (não no diretório do pacote), para que sobreviva a qualquer sincronização do diretório do pacote.

### 🐛 Configuração Por LLM Não Encontrada em npm link / Instalações Globais

Nos mesmos setups, `audio-processor.sh` não conseguia encontrar a configuração de áudio por LLM (voz, reverb, faixa de fundo) quando o seu projeto não era o próprio pacote AgentVibes.

**Correção:** O script agora pesquisa `CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg` antes de recorrer à configuração do pacote.

### 🐛 Faixa de Fundo "Não Encontrada" Após Configuração Correta

Quando uma faixa de fundo estava configurada mas o AgentVibes estava instalado globalmente ou via `npm link`, o arquivo da faixa não podia ser encontrado — apenas o diretório do pacote era pesquisado.

**Correção:** `audio-processor.sh` agora também pesquisa `CLAUDE_PROJECT_DIR/.claude/audio/tracks/` quando a faixa não está no diretório do pacote.

### 🐛 Parser de Linha de Configuração LLM — Volume Absorvendo Colunas Extras

Com uma linha LLM completa de 7 colunas (o formato que a TUI grava), o campo de volume absorvia todas as colunas subsequentes. O ffmpeg recebia uma string de volume malformada e recorria silenciosamente ao áudio somente de voz.

**Correção:** O parser agora captura apenas o campo numérico de volume, deixando as colunas extras em `_rest`.

### 🧪 Suite de Testes CI para Windows

Testes nativos do Windows agora são executados no CI junto com a suite BATS do Linux, bloqueando a publicação para que caminhos específicos do Windows não possam regredir silenciosamente.

---

## 🛡️ v5.6.4 — Correção Crítica de Segurança na Desinstalação

**Lançamento:** 2026-05-08

### 🐛 A desinstalação com `--global` não apaga mais ~/.claude/

Com `--global`, o desinstalador estava removendo `~/.claude/` de forma recursiva em vez de remover apenas os caminhos pertencentes ao AgentVibes dentro dela. Isso causava perda total de dados — configurações, CLAUDE.md, skills, plugins, configurações MCP, ferramentas personalizadas, tudo. Confirmado como real, confirmado como corrigido.

**v5.6.4 realiza uma remoção cirúrgica — apenas os caminhos instalados pelo AgentVibes:**

- `~/.claude/hooks/`, `hooks-windows/`, `commands/agent-vibes/`, `personalities/`, `audio/`
- `~/.agentvibes/` — totalmente de propriedade do AgentVibes, removido por completo
- `settings.json`, `CLAUDE.md`, skills, plugins, configurações MCP — **intocados**

Um teste de regressão agora aplica isso no CI. Se alguém reintroduzir uma exclusão ampla, a compilação falha:

```js
// issue #182 regression guard
assert: settings.json and CLAUDE.md survived --global uninstall
```

Isso não pode regredir silenciosamente — a compilação quebrará primeiro.

---

## 🌟 v5.6.3 — AgentVibes chega ao Hermes + Configuração remota mais fácil

**Lançamento:** 2026-05-07

### 🎉 AgentVibes agora funciona com o Hermes

**[Hermes](https://github.com/NousResearch/hermes-agent)** é um dos agentes de IA de código aberto mais populares do GitHub — mais de 21.000 estrelas e crescendo. AgentVibes agora se integra com ele nativamente: quando o Hermes termina uma resposta, o AgentVibes a fala em voz alta pelos seus alto-falantes automaticamente. Nenhuma configuração extra além de instalar o hook incluído.

### 🎉 Destino de áudio por LLM — escolha de onde vem a voz

Quando você configura um LLM no AgentVibes (Claude Code, Copilot, Codex ou Hermes), você já podia definir uma **voz, estilo de reverb, música de fundo e prefixo de introdução** exclusivos para cada um. Agora você também pode definir o **destino de áudio** por LLM:

- **Local** — reproduzir pelos alto-falantes do computador em que você está trabalhando
- **Remoto** — enviar o áudio para uma máquina diferente (seu laptop, por exemplo) enquanto você trabalha em um servidor remoto ou executa o Hermes na nuvem

### 🎉 Seletor de alias SSH — sem mais digitar caminhos manualmente

Configurar o áudio remoto antes exigia digitar um caminho SSH manualmente. Agora há um **menu suspenso diretamente na TUI do AgentVibes** que lê os aliases SSH que já estão na sua máquina. Escolha o que aponta para seus alto-falantes — pronto. Sua voz te segue seja você local ou remoto.

### 🐛 Correções

- **Sem áudio algum** — algumas configurações produziam silêncio completo sem nenhuma mensagem de erro. Corrigido.
- **Voz errada tocando** — em algumas configurações, o AgentVibes ignorava suas configurações de voz por IA e voltava ao padrão. Corrigido.
- **Configurações de áudio vazando entre mensagens** — música ou reverb definidos para uma mensagem podiam acidentalmente passar para a próxima. Corrigido.
- **Mensagens perdidas após um crash** — se o AgentVibes falhasse no meio de uma mensagem, essa mensagem era perdida. Agora ele a recupera e reproduz ao reiniciar.

---

## 🎛️ v5.6.2 — Per-Message Audio Control for Remote Providers

> See [English release notes](../../RELEASE_NOTES.md) for full details.

---


## 🤖 v5.6.1 — Integração com Hermes Agent & Correções PS5.1 para Windows

**Lançamento:** 2026-05-01

### 🎉 Integração com Hermes Agent (Novo!)

AgentVibes agora suporta oficialmente o **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — o assistente de IA auto-hospedado e auto-aprimorado. Duas skills do Hermes prontas para produção estão incluídas em `docs/hermes/skills/`:

**`hermes-agentvibes-hook`** — Fala automaticamente cada resposta do Hermes via AgentVibes
- Dispara em cada evento `agent:end` (Telegram, Discord, CLI, etc.)
- Remove markdown, blocos de código e emojis antes de falar
- Trunca em limites de palavras, limita a taxa para evitar sobrecarga da fila
- SSH seguro contra MITM com `StrictHostKeyChecking=accept-new` + `known_hosts` persistente
- Log completo em `tts-hook.log` para depuração

**`agentvibes-target`** — Ensina o Hermes a enviar qualquer texto para seus alto-falantes sob demanda
- Payload JSON em base64 via SSH (mesma arquitetura ForceCommand do receptor Windows)
- Suporta alvos Windows e Android
- Guia detalhado de solução de problemas incluído

**Instalação:** Copie a skill para o diretório home do Hermes e reinicie o gateway:
```bash
cp -r docs/hermes/skills/tts/hermes-agentvibes-hook ~/.hermes/skills/tts/
hermes gateway restart
```

### 🐛 Correções PS5.1 para Windows

- **Compatibilidade PS5.1 do play-tts.ps1** — Corrigidas três regressões do rebase da v5.6.0:
  substituído o operador null-condicional do PS7 (`?.`) por if/else compatível com PS5.1, adicionado BOM UTF-8
  para que travessões não sejam corrompidos pelo CP1252, restaurado o alias do provedor piper e
  o sentinel `AGENTVIBES_TEXT_FILE` perdidos na fusão
- **Correções de modal e atalhos de teclado** — Tecla Esc do modal, atalhos de navegação, Q+Caps Lock
  e tratamento de erros de pré-visualização de voz reparados
- **Aba BMAD** — Agora mostra todos os agentes independentemente do módulo

---

## 🎵 v5.5.0 — Roteamento de Áudio por LLM e Resiliência do Instalador Windows

**Lançamento:** 2026-04-27

### 🆕 Roteamento de Áudio por LLM
Cada LLM (Claude Code, Copilot, Codex) agora pode ter sua própria voz, pretexto, reverb e configurações de
música de fundo. O servidor MCP passa `--llm <key>` tanto para `play-tts.sh`
(Linux/macOS) quanto para `play-tts.ps1` (Windows), e os scripts buscam linhas `llm:<key>` em
`audio-effects.cfg`. Linhas padrão para `claude-code`, `copilot` e `codex` já vêm incluídas;
configure-as em **Setup → Default → Configure** na TUI.

### 🐛 Correção do Crash do Instalador Windows
Corrigido o erro `spinner.info is not a function` que fazia o AgentVibes travar em **reinstalações** no Windows
quando os usuários tinham uma instalação global mais antiga. As 10 funções de cópia de arquivos do instalador agora
envolvem seu spinner com `createRobustSpinner()` para que chamadores obsoletos nunca possam causar um crash,
independentemente dos métodos que exponham.

### 🎶 Paridade de Música de Fundo no Windows
A reprodução TTS do Windows agora prefere `ffplay` (reamostragem sinc, sem artefatos) ao reamostrador
`SoundPlayer` do WinMM de baixa qualidade. O novo helper `Invoke-AudioPlay` gerencia o fallback de forma
transparente — se o `ffplay` não estiver disponível, o `SoundPlayer` é usado como antes.

### 🎉 Ponto de Entrada Multiplataforma do Modo Festa
Os arquivos de etapas do modo festa BMAD e a skill do Copilot agora referenciam de forma consistente
`node bin/bmad-speak.js` — o único ponto de entrada multiplataforma que delega para
`bmad-speak.ps1` no Windows e `bmad-speak.sh` nos demais sistemas.

### 🔧 Outras Correções
- `play-tts.sh` agora aceita um flag nomeado `--llm <key>` além da variável de ambiente `LLM_PROVIDER`
- `mcp-server/server.py` roteia a cadeia de prioridade `AGENTVIBES_LLM` → `CLAUDECODE=1` → `AGENTVIBES_MCP_FALLBACK`
  e encaminha a chave resolvida como `-llm`/`--llm` para os scripts TTS
- Adicionadas linhas em `audio-effects.cfg` para `llm:claude-code`, `llm:copilot`, `llm:codex`
- Adicionados `command-routing.test.js` e testes unitários do `ConfigService`
- O guardião de conteúdo do npm pack agora detecta arquivos publicáveis não rastreados

### 📊 Técnico
- 231 testes passando (0 falhas)

---

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
