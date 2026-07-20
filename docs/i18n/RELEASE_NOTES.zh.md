> 🌐 [English version](../../RELEASE_NOTES.md)

## v5.14.0 — 可靠的安装体验与完整的音频预览

**发布日期：** 2026-07-19 · `npm install agentvibes@latest`

本次发布聚焦于两件事：让 AgentVibes 在各个平台上都能正确完成安装，并让预览按钮真实还原代理实际发声的效果。此外，本版本还包含 5.13.2 的全部内容 —— 该版本此前已打标签，但未发布到 npm。

### macOS 和 Linux 上的安装现已顺利完成

在全新的 macOS 或 Linux 机器上，安装 Piper 和下载语音的步骤现在都能正确执行。此前这些步骤可能在尚未运行的情况下就报告失败，导致新用户既没有可用的语音引擎，也不清楚该如何继续。这是一个长期存在的问题，仅影响首次安装 —— 如果你此前放弃过安装，值得再试一次。

相关改动：部分安装脚本现已采用正确的换行符格式保存，因此可以在 macOS 和 Linux 上正常执行。

### 预览播放完整的音频混音

预览按钮现在会精确播放你的代理实际发声的效果：你所选的**语音**、任何**混响或音频效果**，以及你的**背景音乐**，全部混合在一起。

此前有两种情况会播放不完整的混音：Hermes 代理预览完全忽略背景音乐；在 Windows 上，当负责将音乐与语音混合的组件 ffmpeg 不可用时，音乐轨道会被丢弃。两者均已解决。若 ffmpeg 缺失，你现在会收到明确指出该组件的提示信息，而不是在无声中损失部分音频。

### 你的自定义修改在更新后得以保留

如果你修改过 AgentVibes 安装的任何 hook 脚本，更新时你的改动将得到保留。在任何文件被替换之前，你的版本都会被复制为一份带时间戳的备份：

```
play-tts.ps1.user.bak.20260719-143052
```

每次更新都会生成各自的备份，因此更早的版本同样可以恢复。在 Windows 上，更新覆盖范围已从 8 个脚本扩展到全部 25 个。

### 音频输出位置一目了然

设置界面现在会以颜色区分音频的播放位置：**Local** 显示为绿色，**Remote** 显示为红色。这样一来，音频被路由到另一台机器时便一眼可辨。

### 语音预览使用正确的引擎

预览语音时，现在会使用该语音自身的引擎而非全局设置，并会标明你正在听到的是哪个引擎。Windows 和 macOS 系统语音在远程预览中可正常工作，Windows 语音列表现在也只显示真正可供选择的语音。

### Windows 远程音频

从 Windows 机器向另一台电脑发送音频时，文件路径不会再在传输过程中被改动 —— 此前这会导致背景音乐无法送达接收端。

### 安装包与质量

发布的安装包不再包含多余文件，且应用所引用的全部内容现已齐备。完整测试套件可在 Windows、macOS 和 Linux 上从全新检出顺利通过，并新增了覆盖上述预览行为的回归测试。

---
## 🔧 v5.13.2 — 更干净的安装，更顺畅的设置

**发布日期：** 2026-07-17 · 现已进入 `latest` — `npm install agentvibes@latest`

### 🎛️ 从默认设置开始，你可以按自己的想法打造

全新安装现在会以语音、背景音乐和个性的内置默认设置，干净利落地开始 — 从你第一次运行起，这就是属于你自己的设置。

### 🐧 Mac 和 Linux 上的安装现在能正常运行了

一些负责安装配置的脚本，之前以 Mac 和 Linux 都读不懂的 Windows 格式保存，于是它们什么都没做就停住了。现在它们的格式已经修正。在全新的 Mac 或 Linux 电脑上，安装 Piper 和下载语音又能正常工作了。

### 🔊 你选的语音会一直保持

记录"哪个语音对应哪个引擎"的设置文件，之前可能被读取得稍有偏差，于是你选的引擎会被悄悄忽略。已修复 —— 你选什么，就是什么。

### 📦 一个更小、更整洁的安装包

安装包不再携带那些从未用到过的文件。应用提示你要运行的一切，现在都真的包含在里面了。

---

## 🔧 v5.13.1 — Windows 更新，这次真的会更新

**发布日期：** 2026-07-16 · 现已进入 `latest` — `npm install agentvibes@latest`

### 🪟 你的 Windows 脚本现在真的会更新了

在 Windows 上，让你的代理开口说话的那些小脚本，存放在你的 `.claude/hooks` 文件夹里。更新时提示说已经刷新了它们 — 但在 Windows 上其实悄悄没有更新，于是它们可能会停留在你最初安装的版本上，一放就是好几个月。

现在它们会真正更新了。运行 `npx agentvibes update`，你就能获得之前一直错过的所有修复。你自己改过的内容依然会安全保留在旁边，命名为 `.user.bak` 文件，和以前一样。

如果你用的是 macOS 或 Linux，什么都不会变 — 更新在那里本来就一直正常工作。

### 🔒 幕后的一次安全加固

我们更新了 AgentVibes 用来读取设置文件的一个基础组件。一个精心构造的设置文件，本可能让它卡死不动。没有任何东西曾被窃取或窥探过 — 但现在，它也不会再卡住了。你不需要做任何事，这项修复已经生效。

---

## 🎉 v5.13.0 — 你的语音，随处可用，还有提前提醒

**发布日期：** 2026-07-16 · 现已进入 `latest` — `npm install agentvibes`

新增内容：

### 🖥️ 随时随地使用你电脑自带的语音
在一台机器上运行代理，却在另一台机器上聆听？现在你可以选用 **Windows**（David、Zira、Mark）或 **Mac** 内置的语音，并在你所坐的位置直接听到它们。AgentVibes 会向你展示每一个语音，并清晰标记出你的聆听设备能够播放的那些。

### 🗂️ 所有语音尽在一份整洁的列表中
Piper、Kokoro、ElevenLabs、Windows、Mac、Soprano — 每个语音如今都来自同一份列表，所以你所看到的始终就是你能使用的。

### 🔔 声音播放前的"提前提醒"提示音
在语音或音乐预览开始播放之前，你会先听到一声短促的提示音 — 这样你总能知道音频即将到来，即使它稍有延迟。

### 🎵 音乐预览随你的声音而动
预览一段曲目时，它会在你的音频设定的目标位置播放 — 包括在另一台电脑上。

### 🆔 会自我介绍的代理
开启自我介绍后，每个代理在启动时都会说出自己是谁 — 当一整个团队都在发声时，这非常实用。

### 🛟 更新时，你自己的修改会被安全保留

动过 `.claude/hooks` 文件夹里的某个 AgentVibes 文件吗？从这个版本开始，更新再也不会丢掉你的改动。如果我们需要更新一个你改过的文件，会把你的旧版本保留在它旁边，文件名末尾加上 `.user.bak` — 比如 `play-tts.sh.user.bak`。

**这个文件是 AgentVibes 自己生成的 — 没有任何东西坏掉，也不是别的程序放在那里的。** 它只是你的旧版本，保存下来是为了让你可以查看，或者把你的修改复制回新文件中。用完之后随时删除即可。

如果你在旧版本中自定义过文件，值得去 `.claude/hooks` 里看看有没有什么想找回来的内容。

### ✨ 更多语音，更顺畅的体验
- **ElevenLabs** 语音完整支持
- 更多 **Kokoro** 语音，在 Windows 上表现出色
- 在 Windows 上更快、更可靠的安装
- **3,263 项自动化测试通过** — 稳定可靠

---

## 🎉 v5.12.0 — Fable 周大改造（稳定版）

**发布日期：** 2026-07-05 · 现已进入 `latest` — `npm install agentvibes`

本次发布将"Fable 周"的 alpha 版本转为稳定版。在体验 Anthropic 全新 **Fable** 模型的抢先版一周期间，我们让它通读了整个 AgentVibes 代码库，并正式重建了核心部分。

### 更强大、更统一的核心

AgentVibes 每次发声时都要做出大量决策 — 使用哪个语音、哪个引擎、是在本机播放还是把音频发送到另一台机器、背景音乐、音量、静音。这些逻辑曾被复制到多个独立脚本中（Mac/Linux、Windows、远程以及语音服务器），而这些副本逐渐**产生了分歧** — 某处的修复在其他地方被遗漏，这正是某些故障反复出现的原因。

我们用**一个共享核心**替换了所有这些逻辑，如今 AgentVibes 的每一部分都遵循它 — 只需在一处修复，只需信任一处。你会注意到：

- **过去在 Linux 上静默的 Kokoro 语音现在到处都能正常工作。**
- **你的语音选择会保留** — 设置不再被悄悄覆盖。
- **音量、静音和远程播放在 Mac、Linux 和 Windows 上表现一致。**
- **默认安全** — 如果你的机器上没有新核心，AgentVibes 会回退到旧行为，所以它绝不会突然停止说话。

### 预览现在会在正确的位置播放

过去预览语音或曲目时，总是在你当前所坐的机器上播放 — 如果你已将 AgentVibes 设置为把音频发送到别处，这里就会是静默的。现在：

- **如果你配置了 SSH 远程，预览会在你的接收器上播放；否则会像以前一样在本地播放。**
- 这涵盖了来自 Setup、Agent 和 Settings 界面的**语音预览**（Piper 和 Kokoro），以及**音乐/曲目预览** — 按空格键播放，再按空格键停止。

### 更简洁的语音菜单

- 我们**移除了多余的 Voices 标签页。** 它只列出 Piper 语音，让人困惑，因为为任何提供商选择语音本来就在 **Setup** 中。

### 为后续工作打下基础

- 接收器现在还会收到消息来源**项目文件夹的完整路径**（新增的 `projectPath` 字段，与它原先已收到的项目名称并列）— 为即将到来的增强功能打下基础。

### 发布前经过审查

我们对这些改动进行了三轮独立审查 — 安全性、正确性和回归 — 并在发布前修复了每一个真实存在的问题。

## 🎸 v5.8.0 — Soprano 现已正常工作 + 修复了所有引擎的语音选择器

**发布日期：** 2026-05-18

### 🐛 Soprano TTS 曾无法工作 — 现已修复

Soprano（我们在 v5.6 引入的 80M 参数神经网络 TTS 引擎）在 Windows 上一直静默失败。多个问题组合导致其从头到尾无法正常工作：

- Windows 语音选择器将 Soprano 显示为选项，但使用了错误的二进制文件名（`soprano-tts` 而非 `soprano`）来启动它
- `play-tts-soprano.ps1` 从 Node.js 以精简的 PATH 被调用，因此即使已安装，`soprano` 和 `soprano-webui` 可执行文件也无法被找到
- wav 文件路径被写入 PowerShell 的 Information 流（`Write-Host`）而非 stdout，导致混响/背景音乐处理器无法找到该路径
- Gradio WebUI 从未自动启动 — 每次会话前都需要手动运行 `soprano-webui`

所有这些问题现已修复。AgentVibes 会自动检测 Soprano WebUI 服务器是否在端口 7860 上运行，如未运行则启动它，并轮询直到就绪（最多 90 秒）。三种模式按优先级顺序工作：WebUI（最快 — 模型保持加载状态）→ OpenAI 兼容 API → 直接使用 `soprano` CLI。

### 🐛 语音选择器忽略了 Windows SAPI 和 macOS Say

打开配置为使用 **Windows SAPI** 或 **macOS Say** 的 LLM 的语音选择器时，选择器显示了完整的 Piper 语音列表，而非引擎内置语音。这令人困惑 — 使用 SAPI 或 macOS Say 时选择 Piper 语音毫无效果，空格键预览也通过错误的引擎播放。

选择器现在会根据所选引擎进行适配：

- **Windows SAPI / macOS Say / Soprano：** 仅显示一个条目（引擎内置语音），自动选中，空格键预览通过正确的引擎二进制文件发声
- **Piper：** 如以前一样显示完整的已安装语音目录

此外，保存配置时，当原生引擎正在使用时，不再悄悄将 `ttsEngine` 字段覆盖为 `piper`。

### 🔒 Soprano 稳定性（对抗性审查的 9 项修复）

- **崩溃修复：** 套接字 `destroy()` 可能会发出无监听器的延迟 `error` 事件，导致 Node.js 进程崩溃 — 现已添加吸收处理器
- **循环取消：** 当模态框或语音选择器关闭时，90 秒的 WebUI 轮询循环现在会立即停止（通过 AbortController）
- **无未处理的拒绝：** 为所有异步 WebUI 检查调用添加了 `.catch()` 处理器
- **无重复进程：** 10 秒冷却防止快速点击预览时启动两个 `soprano-webui` 实例
- **更好的错误反馈：** spawn 失败和非零退出代码现在会在语音选择器中显示可见的错误标签
- **PATH 保留：** PowerShell PATH 刷新现在追加注册表条目而非替换整个 PATH，确保 nvm、conda 和 pyenv 的 shim 继续工作

---

## 🎭 v5.7.7 — 派对模式语音恢复 + 改进

**发布日期：** 2026-05-17

### 🐛 BMAD 派对模式代理无声（无每代理 TTS）

派对模式代理以文本显示响应，但未用其独特声音朗读。两个根本原因：

**技能消歧：** `/party-mode` 匹配了上游 BMAD 命令 `_bmad/core/workflows/party-mode`（尝试加载此项目中不存在的路径），而非 AgentVibes 技能。项目本地 `/party-mode` 命令覆盖现在路由到正确的技能。

**必需 TTS 步骤：** 编排器的 `bmad-speak.js` 调用步骤规范不足，有时被跳过。BMAD 派对模式技能中的步骤 4 现在明确标记为必需，并附有 `bmad-speak.js` 每代理应用内容的明确文档：声音、预文本、混响、个性和背景音乐 — 全部从 `~/.agentvibes/bmad-voice-map.json` 自动加载。

### 🔍 派对模式诊断日志

`bmad-party-speak.sh`（PostToolUse 钩子）现在将结构化诊断条目写入 `/tmp/agentvibes-party-debug.log` — `fired`、`fingerprint HIT/MISS`、`invoking` 和错误 — 无需猜测即可诊断语音问题。

### 🎵 新捆绑曲目：CelestialVelvet

新的环境音乐曲目 **CelestialVelvet**（🌌）已添加到内置目录。在 TUI 音乐选择器和 BMAD 语音映射中立即可用 — 无需下载。

### 🐛 TUI：修复选定行的灰色文本

现在在"声音"和"代理"选项卡的选定行中正确呈现白色文本。以前，`bright-black` 前景色与绿色背景结合在许多终端中产生难以阅读的灰色文本。

### 🐛 SSH 远程："wait: pid is not a child of this shell" 错误

`play-tts-ssh-remote.sh` 在某些 shell 中会发出 `wait: pid X is not a child of this shell`。通过在后台子 shell 内直接生成 `ssh` 来修复，使 `$?` 无需跨 shell `wait` 调用即可捕获退出代码。

---

## 🔧 v5.7.6 — SSH 远程负载完整性 + 接收器重写

**发布日期：** 2026-05-16

### 🐛 SSH 远程播放错误的音乐和语音

使用 SSH 远程 TTS 功能时，应用了错误项目的音乐曲目和语音。根本原因：`CLAUDE_PROJECT_DIR` 未转发给发送方，导致其回退到全局配置而非活动项目的 `audio-effects.cfg`。

### 🐛 Bash 接收器与 JSON 负载格式不兼容

Linux/Termux bash 接收器（`agentvibes-receiver.sh`）使用 v5.5 之前的位置参数格式，完全无法解码当前的 base64 JSON 负载。接收器已完全重写以匹配 PowerShell 接收器的逻辑：解码 base64、解析 JSON、应用语音/音乐/效果/音量并验证所有字段。

### 🐛 远程个性介绍被听到两次

使用 SSH 远程 TTS 时，个性 pretext（如 "Bcs latin dance here"）会被说两次。根本原因：`play-tts.sh` 在调用发送方之前已将 pretext 添加到语音文本前面；发送方还将其打包到 JSON `pretext` 字段中，导致接收器再次添加。JSON `pretext` 字段现在有意保留为空——个性仅通过 `text` 字段传递。

### 🆕 设置选项卡中显示 SSH 主机别名

配置的 SSH 远程主机别名现在显示在设置和语音选项卡中，用户无需打开配置文件即可确认 TTS 的目标远程机器。

### 🔒 安全修复

SSH 远程发送方和接收器的输入验证改进。

### 🧪 24 个新的 BATS 测试

- 15 个 SSH 远程负载测试：验证语音、音乐曲目、音量、混响/效果、pretext 处理、LLM 标识符、项目配置优先级和 JSON 有效性
- 9 个端到端往返测试：发送方构建负载 → 接收器同时解码并应用所有字段，捕获任何一端的回归

---

## 🖥️ v5.7.5 — TUI 按钮对比度 + BMAD 路由修复

**发布日期：** 2026-05-13

### 🐛 TUI 按钮焦点：在所有终端中消除灰色文字

TUI（声音、音乐、设置、安装选项卡）中的焦点和选中按钮在许多终端中显示浅蓝色背景上的浅灰色文字。根本原因：`bold: true` 与深色前景色结合触发终端的"亮色模式"，无论确切的色调如何都将颜色渲染为灰色。

**修复：** 所有按钮焦点状态现在使用**深绿色背景（`#2e7d32`）上的白色文字** — 与代理选项卡已使用的相同高对比度模式。setup-tab 模态按钮添加了显式的 `focus`/`blur` 处理程序，以防止 `attachBtnBlink` 干扰 blessed 的被动 `style.focus` 颜色应用。

### 🐛 BMAD 选项卡语音选择器 ♪ 指示符不显示

BMAD 选项卡语音列表中的 ♪ 预览指示符在预览期间未出现。代理选项卡缺少设置选项卡已有的 `_refreshVP()` 调用。当 SSH-remote 立即退出时（fire-and-forget 模式），2秒最小显示计时器使指示符保持可见。

### 🐛 非交互式安装：通用预文本而非项目名称

以非交互方式运行 `agentvibes install` 总是将预文本设置为 `"Claude Code here"`，而不考虑项目。安装程序现在从 `path.basename(process.cwd())` 派生带有大写的项目感知预文本（例如 `"MyProject here"`），并为 Docker 根路径提供安全回退。

### 🐛 全局预文本覆盖项目配置

`seedAllLlmDefaultsSync` 用全局预文本字符串填充项目级别的 LLM 行，导致全局的 `"Claude Code here"` 覆盖了每个项目的 `tts-pretext.txt` 值。项目级别的行现在用空预文本填充，以便项目文件优先。

### 🐛 `screen`/`tmux` TERM 变体导致 `plab_norm` 功能错误

当 `TERM` 设置为 `screen-*` 或 `tmux-*` 变体时，blessed 在启动时抛出 `plab_norm` 终端功能错误。现在，当检测到此类变体时，应用在创建 blessed 屏幕之前将 `TERM` 覆盖为 `xterm-256color`。

### 🐛 BMAD 每代理音乐/混响未到达 SSH 接收器

`play-tts.sh` 没有将 `AGENT_PROFILE_FILE` 转发到 SSH 远程传输，因此 BMAD 选项卡中配置的每代理背景音乐和混响覆盖对于远程音频被静默忽略。配置文件路径现在作为参数 4 传递给 `play-tts-ssh-remote.sh`。

### 🐛 Node 18 兼容性：替换 `import.meta.dirname`

测试文件使用了仅在 Node 21+ 中可用的 `import.meta.dirname`。已替换为 `fileURLToPath(import.meta.url)` 模式，使测试在 Node 18 和 20 上正确运行。

---

## 🎭 v5.7.0 — BMAD v6.6 支持 + Windows 监视器自动重启

**发布日期：** 2026-05-11

### 🆕 BMAD v6.6.0 兼容性

BMAD v6.6 重新规划了代理的存放位置 — 从 `_bmad/bmm/agents/` 迁移到 `.claude/skills/*/agents/`。AgentVibes 现在可以正确检测和扫描这些新路径。

**TTS 注入**现在可以优雅地跳过 v6.6+ 代理（使用不带 XML/YAML 激活部分的纯 Markdown），而不是抛出错误。安装摘要现在清楚地显示跳过了多少代理与修改了多少代理。

**BMAD 标签检测**现在可以找到安装在 `~/_bmad`（主目录安装）的全局 BMAD，以及项目本地安装。以前，即使 BMAD 已全局安装，BMAD 标签也会显示"未检测到"。

**安全性：** 安装程序的路径验证现在正确允许用户主目录下的 BMAD 路径，修复了全局安装时"无效 BMAD 路径"的误报。

### 🆕 Windows TTS 监视器 — 独立文件 + 自动重启

`tts-watcher.ps1` 现在作为独立文件提取到 `~/.agentvibes/tts-watcher.ps1`。运行 `npx agentvibes update` 现在会复制最新的监视器**并**自动重启它 — 文件和进程都在一步中更新，无需手动重启。

### 🐛 Windows 提供商覆盖在笔记本上得到遵守

`play-tts.ps1` 现在在通过 SSH 接收音频时从 Linux 端配置读取 `ProviderOverride` 设置。以前，即使服务器指定了不同的提供商，笔记本也始终使用其本地配置的提供商。

### 🐛 语音管理器添加了 Sample 命令

`voice-manager.sh sample` 缺少处理程序 — 调用时会静默地落入使用/退出路径。已修复。

### 🐛 预览 SSH 路由检测到正确的端点

`provider-manager.sh` 现在包含 `detect_routing_llm()`，它检查 `AGENTVIBES_LLM_KEY`，然后在 `transport-config.json` 中查找第一个 `mode=remote` 条目，使预览音频到达正确的 SSH 主机。

---

## 🔇 v5.6.9 — NPX 安装中混响和背景音乐静音

**发布日期：** 2026-05-09

### 🐛 所有 NPX 用户的混响和背景音乐静默失效

通过 `npx` 安装 AgentVibes 时，钩子文件从 npm 包中以 644 权限解压——没有执行位。`play-tts-piper.sh` 直接调用 `audio-processor.sh`，对于不可执行的文件会立即以代码 126（权限拒绝）退出。所有 `npx` 安装的用户只能获得纯语音 TTS——没有混响，没有背景音乐，无声无息。

**修复1：** `play-tts-piper.sh` 现在通过 `bash "$SCRIPT_DIR/audio-processor.sh"` 调用 `audio-processor.sh`，绕过执行位检查。
**修复2：** `install-deps.js`（postinstall）现在运行 `ensureHookPermissions()`，在 npm install 后对所有 `.sh` 文件执行 `chmod 755`。

### 🐛 语音浏览器预览忽略了混响和背景音乐

语音浏览器中的**预览**按钮播放原始 piper 输出，没有混响和背景音乐，完全绕过了 `audio-processor.sh`。

**修复：** 预览音频现在通过与真实 TTS 相同的 `audio-processor.sh` 管道处理。

### 🐛 MCP `text_to_speech` 返回损坏的文件路径和缺失的语音信息

该工具错误地提取了音频文件路径（包含末尾的大小/表情符号字符），从未在响应中报告语音名称。

**修复：** 解析前去除 ANSI 代码，干净地提取 `.wav` 路径，并在工具响应中包含 `🎤 使用的语音：` 行。

### 🐛 TUI 背景音乐开关不生效

在**音乐**标签中启用背景音乐会写入 `config.json`，但不写入 bash 钩子读取的 `background-music-enabled.txt`。切换后音乐仍然关闭。现在保存曲目也意味着启用音乐。

---

## 🐧 v5.6.8 — WSL 语音路由已修复 + 会话生命周期可靠性提升

**发布日期：** 2026-05-09

### 🐛 WSL：现在播放已配置的语音（不再回退到 lessac）

在 WSL 会话中，无论配置了什么语音，AgentVibes 都会播放 `en_US-lessac-medium`。根本原因：`pipx` 将 Piper 安装到 `~/.local/bin/`，交互式 Shell 通过 `.bashrc`/`.zshrc` 获取此路径，但 Claude Code 的 Bash 工具调用以非交互方式运行，跳过了配置文件加载 — `command -v piper` 失败，回退到默认语音。

**修复：** `play-tts-piper.sh` 现在在二进制文件检查前将 `~/.local/bin` 和 pipx Piper venv bin 追加到 `PATH` 开头，因此无论 Shell 模式如何，都能找到 Piper。

### 🐛 `CLAUDE_PROJECT_DIR` 不在 Bash 环境中时，项目专属语音/音乐丢失

当 Claude Code 执行 Bash 工具调用时，`CLAUDE_PROJECT_DIR` 不会传入环境。TTS 钩子无法找到项目专属配置，回退到全局默认值 — 语音错误、音乐错误、无前缀文本。

**修复：** `session-start-tts.sh`（及 `.ps1`）现在将项目目录作为 `--project-dir` 烘入注入的钩子命令中。`play-tts.sh` 在任何配置查找之前读取此标志，因此在每次 Bash 工具调用中项目专属路由都是可靠的。

### 🐛 `play-tts-piper.sh` 和 `play-tts-piper.ps1` 未被 `agentvibes install` 部署

这些钩子未包含在 `CRITICAL_HOOKS` / `CRITICAL_HOOKS_WINDOWS` 中，因此 `agentvibes install` 从未将更新版本传播到 `~/.claude/hooks/`。

**修复：** 两者现已列入关键钩子列表，安装/更新时始终部署。

### 🐛 语音显示名称错误

- `uniquifyVoiceName("Mary-1")` 返回 `"Mary-1 Bell"` 而非 `"Mary Bell"`。
- `Rose_Ibex` 等 16Speakers 名称被错误地追加了姓氏（`"Rose Ibex Bell"`）。
- WSL bash 输出中缺少 `🎤 Voice used:` 行。

三处均已修复。新增测试文件（`test/unit/voice-names.test.js`，16 个测试）覆盖这些场景。

---

## 🪟 v5.6.7 — Windows 预览按钮已修复

**发布日期：** 2026-05-08

### 🐛 Windows 上的预览按钮现在可以正确工作

在 Windows 上为每个 LLM 配置音频时，点击**预览**会播放错误的语音（默认为 Windows SAPI），且没有背景音乐或混响。现在它将精确播放您配置的语音、混响和背景音轨。

### 🧪 新增回归测试

两个新的 Windows CI 测试验证预览配置查找逻辑 — 确保此问题在未来版本中不会悄悄回归。

---

## 🔇→🎵 v5.6.6 — npm link 与全局安装的背景音乐预览已修复

**发布日期：** 2026-05-08

### 🐛 预览时背景音乐无声失败（npm link / 全局安装）

在 LLM 配置模态框中点击**预览**并设置了背景音轨时，您只能听到语音 — 没有音乐 — 除非 AgentVibes 以本地依赖方式安装。无论您以何种方式安装 AgentVibes，此问题均已修复。

**根本原因：** 在 `npm link` 和全局安装方式下，一个使用 `rsync --delete` 的同步脚本会周期性地从软件包目录中删除 `background-music-enabled.txt`，因为该文件被 gitignore 忽略。删除后，`audio-processor.sh` 回退到一个禁用了音乐的全局配置 — 导致无声。

**修复：** `audio-processor.sh` 现在**优先**检查 `CLAUDE_PROJECT_DIR/.claude/config/background-music-enabled.txt`。TUI 预览也将该标志写入项目目录（而非软件包目录），使其在任何软件包目录同步后仍能保留。

### 🐛 npm link / 全局安装中找不到每 LLM 配置

在相同的安装方式下，当您的项目不是 AgentVibes 软件包本身时，`audio-processor.sh` 无法找到每 LLM 音频配置（语音、混响、背景音轨）。

**修复：** 脚本现在在回退到软件包配置之前，优先搜索 `CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg`。

### 🐛 正确配置后背景音轨"未找到"

当背景音轨已配置但 AgentVibes 以全局或 `npm link` 方式安装时，找不到音轨文件 — 只搜索了软件包目录。

**修复：** `audio-processor.sh` 现在在软件包目录中找不到音轨时，还会搜索 `CLAUDE_PROJECT_DIR/.claude/audio/tracks/`。

### 🐛 LLM 配置行解析 — 音量字段吸收多余列

使用完整 7 列 LLM 行（TUI 写入的格式）时，音量字段会吸收所有尾随列。ffmpeg 收到格式错误的音量字符串，悄悄回退到仅有语音的音频。

**修复：** 解析器现在只捕获数值音量字段，将多余列留在 `_rest` 中。

### 🧪 Windows CI 测试套件

Windows 原生测试现在在 CI 中与 Linux BATS 套件并行运行，在发布前把关，确保 Windows 特定路径不会悄悄回归。

---

## 🛡️ v5.6.4 — 卸载安全关键修复

**发布日期：** 2026-05-08

### 🐛 `--global` 卸载不再清除 ~/.claude/

使用 `--global` 时，卸载程序会递归删除 `~/.claude/`，而不是仅删除其中属于 AgentVibes 的路径。这导致数据完全丢失 — 设置、CLAUDE.md、skills、插件、MCP 配置、自定义工具，全部消失。已确认为真实问题，已确认修复。

**v5.6.4 执行精准删除 — 仅删除 AgentVibes 安装的路径：**

- `~/.claude/hooks/`、`hooks-windows/`、`commands/agent-vibes/`、`personalities/`、`audio/`
- `~/.agentvibes/` — 完全由 AgentVibes 所有，整体删除
- `settings.json`、`CLAUDE.md`、skills、插件、MCP 配置 — **保持不变**

回归测试现在在 CI 中强制执行此约束。如果有人重新引入大范围删除，构建将失败：

```js
// issue #182 regression guard
assert: settings.json and CLAUDE.md survived --global uninstall
```

这不会悄悄地回归 — 构建会首先失败。

---

## 🌟 v5.6.3 — AgentVibes 支持 Hermes + 更简单的远程设置

**发布日期：** 2026-05-07

### 🎉 AgentVibes 现已支持 Hermes

**[Hermes](https://github.com/NousResearch/hermes-agent)** 是 GitHub 上最受欢迎的开源 AI 代理之一 — 拥有 21,000 余颗星并持续增长。AgentVibes 现在开箱即用地与其集成：当 Hermes 完成响应后，AgentVibes 会自动通过扬声器大声朗读。除了安装附带的 hook 外，无需额外设置。

### 🎉 每个 LLM 独立音频目标 — 选择声音从哪里发出

在 AgentVibes 中配置 LLM（Claude Code、Copilot、Codex 或 Hermes）时，您已经可以为每个 LLM 设置独特的**语音、混响风格、背景音乐和前缀介绍**。现在您还可以为每个 LLM 设置**音频目标**：

- **本地** — 通过您正在工作的计算机的扬声器播放
- **远程** — 在远程服务器上工作或在云端运行 Hermes 时，将音频发送到其他机器（例如您的笔记本电脑）

### 🎉 SSH 别名选择器 — 告别手动输入路径

以前设置远程音频需要手动输入 SSH 路径。现在 **AgentVibes TUI 中直接内置了一个下拉菜单**，可以读取您机器上已有的 SSH 别名。选择指向您扬声器的那个 — 完成。无论您是在本地还是远程工作，声音都会跟随您。

### 🐛 修复

- **完全没有音频** — 某些配置会出现完全无声的情况，且没有任何错误提示。已修复。
- **播放了错误的声音** — 在某些配置中，AgentVibes 会忽略您的每个 AI 声音设置并回退到默认值。已修复。
- **音频设置在消息间泄漏** — 为某条消息设置的音乐或混响可能会意外延续到下一条消息。已修复。
- **崩溃后消息丢失** — 如果 AgentVibes 在消息处理中途崩溃，该消息就会丢失。现在它会在重启时恢复并重新播放。

---

## 🎛️ v5.6.2 — Per-Message Audio Control for Remote Providers

> See [English release notes](../../RELEASE_NOTES.md) for full details.

---


## 🤖 v5.6.1 — Hermes Agent 集成 & Windows PS5.1 修复

**发布日期：** 2026-05-01

### 🎉 Hermes Agent 集成（全新！）

AgentVibes 现已正式支持 **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — 自托管、自我改进的 AI 助手。两个生产就绪的 Hermes 技能随附于 `docs/hermes/skills/`：

**`hermes-agentvibes-hook`** — 通过 AgentVibes 自动播报每条 Hermes 响应
- 在每个 `agent:end` 事件触发（Telegram、Discord、CLI 等）
- 播报前去除 Markdown、代码块、表情符号
- 在单词边界处截断，限制速率以防止队列溢出
- 使用 `StrictHostKeyChecking=accept-new` + 持久 `known_hosts` 防止 MITM 的安全 SSH
- 完整日志记录到 `tts-hook.log` 以便调试

**`agentvibes-target`** — 教 Hermes 按需将任意文本发送到您的扬声器
- 通过 SSH 传输 Base64 JSON 负载（与 Windows 接收器相同的 ForceCommand 架构）
- 支持 Windows 和 Android 目标
- 包含详细的故障排除指南

**安装：** 将技能复制到 Hermes 主目录并重启网关：
```bash
cp -r docs/hermes/skills/tts/hermes-agentvibes-hook ~/.hermes/skills/tts/
hermes gateway restart
```

### 🐛 Windows PS5.1 修复

- **play-tts.ps1 PS5.1 兼容性** — 修复 v5.6.0 变基引入的三个回归问题：
  将 PS7 的 null 条件运算符（`?.`）替换为 PS5.1 兼容的 if/else，添加 UTF-8 BOM
  防止 CP1252 损坏 em 破折号，恢复合并中丢失的 piper 提供者别名和
  `AGENTVIBES_TEXT_FILE` 标记
- **模态框 & 快捷键修复** — 模态框 Escape 键、导航快捷键、Q+Caps Lock、
  语音预览错误处理全部修复
- **BMAD 选项卡** — 现在显示所有代理，不受模块限制

---

## 🎵 v5.5.0 — 每 LLM 音频路由与 Windows 安装程序可靠性增强

**发布日期：** 2026-04-27

### 🆕 每 LLM 音频路由
每个 LLM（Claude Code、Copilot、Codex）现在可以拥有各自的语音、前缀文本、混响和背景音乐设置。
MCP 服务器将 `--llm <key>` 同时传给 `play-tts.sh`（Linux/macOS）和 `play-tts.ps1`（Windows），
脚本在 `audio-effects.cfg` 中查找 `llm:<key>` 行。`claude-code`、`copilot` 和 `codex` 的默认行
已内置提供；可通过 TUI 的 **Setup → Default → Configure** 进行配置。

### 🐛 Windows 安装程序崩溃修复
修复了在 Windows 上有旧版全局安装时，AgentVibes **重新安装**时触发的 `spinner.info is not a function` 错误。
安装程序中所有 10 个文件复制函数现在用 `createRobustSpinner()` 包装其 spinner，无论调用方暴露哪些方法，
过时的调用者都不会再导致崩溃。

### 🎶 Windows 背景音乐同等支持
Windows TTS 播放现在优先使用 `ffplay`（sinc 重采样，无杂音）而非低质量的 WinMM `SoundPlayer` 重采样器。
新的 `Invoke-AudioPlay` 辅助函数透明地处理回退 —— 如果 `ffplay` 不可用，则像以前一样使用 `SoundPlayer`。

### 🎉 派对模式跨平台入口点
BMAD 派对模式步骤文件和 Copilot skill 现在统一引用 `node bin/bmad-speak.js` ——
这是唯一的跨平台入口点，在 Windows 上委托给 `bmad-speak.ps1`，在其他系统上委托给 `bmad-speak.sh`。

### 🔧 其他修复
- `play-tts.sh` 现在除 `LLM_PROVIDER` 环境变量外，还接受命名标志 `--llm <key>`
- `mcp-server/server.py` 按优先级链 `AGENTVIBES_LLM` → `CLAUDECODE=1` → `AGENTVIBES_MCP_FALLBACK` 路由，
  并将解析后的键以 `-llm`/`--llm` 形式转发给 TTS 脚本
- 在 `audio-effects.cfg` 中添加了 `llm:claude-code`、`llm:copilot`、`llm:codex` 行
- 添加了 `command-routing.test.js` 和 `ConfigService` 单元测试
- npm pack 内容守卫现在可检测未追踪的可发布文件

### 📊 技术
- 231 个测试通过（0 个失败）

---

## 🎛️ v5.4.0 — TUI 安装程序、Spinner 修复与依赖清理

**发布日期：** 2026-04-22

### ✨ 新功能
- **TUI 安装程序**：用于引导式安装的交互式终端 UI — 从精美的终端界面浏览语音、配置提供商、启用 BMAD 派对模式
- **跨平台 Spinner 修复**：解决了 WSL/Linux 上阻止安装的 `spinner.info is not a function` 崩溃问题

### 🐛 Bug 修复
- **移除循环自依赖**：`package.json` 依赖于 `agentvibes@^3.5.9`（即自身），导致 npm 用旧的有问题的版本覆盖了修复后的二进制文件 — 这是重复安装时 spinner 崩溃的隐性原因
- **恢复背景音乐音量回退**：恢复了在合并中丢失的 `audio-processor.sh` 中的 `bg_volume="0.20"` 回退值
- **修复 `play-tts.sh` 中的 PROJECT_ROOT 检测**：向上查找逻辑多走了 2 层，导致 TTS 使用全局 `~/.agentvibes` 配置而非项目配置

### 🔧 技术
- 706/738 个测试通过

---

## 🎯 v5.3.0 — 掌控远程语音

**发布日期：** 2026 年 4 月

如果你用 AgentVibes 从服务器向手机、笔记本或其他机器发送语音通知，这个版本把主导权交还到你手里。现在每一次调用都可以挑选自己的语音、背景音乐、前缀短语、混响、音量和语速 —— 直接从命令行上设置，仅对这一条消息生效。

### ✨ 新功能

#### 现在可以单独定制每条通知

以前，如果你想让某条特定消息使用不同的语音或音乐，就得去改配置文件（还得记得改回来）。现在只要在命令里加个标志就行。

想让 Winston 用他的英式口音说话，并在这条部署通知里配上爵士乐？很简单：

```bash
bash .claude/hooks/play-tts-ssh-remote.sh \
  --text "Deploy complete" \
  --voice "en_US-ryan-high" \
  --pretext "Winston here" \
  --music "Late Night Hip Hop Groove.mp3" \
  --volume 0.25
```

没有指定的内容会回退到你的正常设置。想仅此一次跳过前缀短语？传入 `--pretext ""`，消息前就会保持静默。

**可用标志：**
- `--voice` — 使用哪个 Piper 语音
- `--pretext` — 消息前的前缀短语（传入 `""` 可跳过）
- `--music` — 背景音乐轨（带空格的文件名现在也可以用了！）
- `--volume` — 背景音乐的音量（0.0 到 1.0）
- `--effects` — 音效链，比如混响
- `--speed` — 语音说话的速度
- `--provider` — 使用哪个 TTS 引擎
- `--agent` — 使用哪个代理人格

旧的调用方式仍然可用，你已经配置好的东西不会受影响。

### 🛠 可靠性修复

- **长消息和特殊字符不再被截断。** 在 Windows 上，长通知或包含引号、撇号、表情符号的文本在到达语音引擎前会被破坏。已修复 —— 无论多长多奇怪，你的消息现在都会原样送达。

- **无显示器的 Windows 服务器上语音通知现已可用。** Windows 拒绝在 SSH 常用的"服务"会话中播放音频。现在有一个小型后台助手运行在你的常规用户会话中，从队列中取出通知，无头服务器上也能正确播放音频。

- **TUI 中的语音预览在远程服务器上可用。** 以前，如果你在没有扬声器的服务器上预览语音，它会尝试在本地播放（然后失败）。现在它会正确地流式传输到你配置的远程设备上。

- **不再出现双重前缀短语。** 如果你在发送服务器和接收机器上都设置了前缀，以前会听到两次。现在发送方的版本胜出 —— 接收方不会再叠加自己的前缀。

- **远程流式传输设置现在真正生效了。** 最近的一次改动意外导致远程流式传输的配置（`ssh-remote`、`agentvibes-receiver`）被覆盖，回退到本地播放。已修复。

- **长通知不会被中途打断。** 用来停止卡住音频的安全超时对长消息来说过于激进。现在宽松到足以处理段落级别的长通知。

- **安装器状态更干净** — 为 Claude Code 安装 AgentVibes 时，现在会显式写入其 TTS 提供程序文件，而不是依赖隐式状态。

### 🧪 测试

55 个新测试确保 BMAD 派对模式持续可用：每个代理都分到自己独特的语音和音乐，代理之间不会意外共用同一个 Piper 说话者 ID，安装器始终将派对模式指向跨平台入口点。

---

## 🎯 v5.2.1 — 多 LLM 身份识别与安装优化

**发布日期：** 2026 年 4 月

为 Copilot/Codex 精心打磨的 LLM 路由和更加精致的设置体验。

### ✨ 新功能

#### 多 LLM 身份路由

- **GitHub Copilot 现在拥有自己的语音、前缀和背景音乐** — 与 Claude Code 和 Codex 完全区分开。在博萨诺瓦的节奏中说"Copilot here"问好。

- **每工具的 MCP 配置都带有明确的身份** — 每个 AI 工具 (`.vscode/mcp.json`、`.codex/config.toml`、`~/.copilot/mcp-config.json`) 都设置自己的 `AGENTVIBES_LLM`,使路由具有确定性。

- **MCP 工具 `get_config` 现在会返回检测到的 LLM** — 调用方助手可以确认其路由并从一开始就用正确的声音响应。

- **Linux 兼容性优化** — CRLF 行尾、权限和传输提供程序覆盖处理。

#### 安装流程改进

- **键盘导航流程** — 在安装按钮 (Claude → Copilot → Codex) 上按 Enter 后,现在会跳转到 **Claude 配置**,让你依次通过三个配置后再到达默认项。

- **向下箭头跳过默认行** — 从安装/删除列。

- **部分安装成功消息** — 如果文件复制成功但 MCP 配置需要小调整,你会看到明确的警告而不是通用的失败。

#### 默认值

- **Claude Code 的默认背景音乐**设置为 Chillwave (`agent_vibes_chillwave_v2_loop.mp3`)。

#### 底层改动

- 强化 LLM 密钥验证,让环境变量处理更安全。
- 改进了 Copilot CLI 配置写入极端情况的错误日志记录。
- 已记录的已知限制:如果你从 Claude Code 启动的终端启动 VS Code,`CLAUDECODE=1` 可能会泄漏 — 解决方法是先执行 `unset CLAUDECODE`。

---

## 🎯 v5.2.0 — 远程语音预览 + 穴居人模式 + 语音评分

**发布日期:** 2026 年 4 月

此版本新增了远程 TTS 预览支持、全新的超简洁详细度模式，以及 TUI 全局的点赞/差评语音评分功能。

### 新功能

- **穴居人详细度模式** — 用于超简洁 TTS 输出的全新 `caveman` 详细度级别。输出片段而非完整句子。可通过 `/agent-vibes:verbosity caveman` 或 MCP `set_verbosity` 工具进行设置。若新安装后没有可用语音，则自动下载。

- **点赞/差评语音评分** — 用 👍/👎 评分取代旧的星标收藏。在 Voices 选项卡和语音选择器（Setup 选项卡）中均可按 `+` 点赞、按 `-` 差评。评分跨会话持久保存，并在所有语音选择界面之间共享。

- **远程语音预览** — TUI Voices 选项卡、语音选择器和语音浏览器中的语音预览现在可在无头服务器上运行。当活跃提供商为 `ssh-remote` 或 `agentvibes-receiver` 时，预览通过 `play-tts.sh` 路由，在远程接收器上播放音频，无需本地 Piper + 音频播放器。平台感知：Windows 使用 PowerShell，Linux 使用 bash。

- **SSH 接收器提供商路由** — `ssh-remote` 和 `agentvibes-receiver` 现已成为 `play-tts.sh` 的一级提供商。`speak_text()` 函数和主路由 case 语句均支持它们，消除了"Unknown provider"错误。

### 修复

- **自动修补 LibriTTS 说话者名称** — 语音下载时现在自动修补 LibriTTS 说话者名称，使多说话者语音开箱即用。
- **语音验证正则表达式加固** — `play-tts-ssh-remote.sh` 和 `play-tts-agentvibes-receiver.sh` 中的 VOICE 参数正则表达式现在允许 `::`（多说话者）、`.`（区域）和空格（说话者名称），同时拒绝反斜杠（注入风险）。Linux 和 Windows 接收器模板已同步更新。
- **`base64` 跨平台兼容性** — `play-tts-agentvibes-receiver.sh` 现在会探测 GNU `base64 -w 0`，回退到 BSD `-b 0`，再回退到 `tr -d '\n'`。修复了 macOS/BSD 系统上的脚本中止问题。
- **音频效果重复处理修复** — 设置 `AGENTVIBES_NO_PLAY` 时，`play-tts-piper.ps1` 会跳过自身的音频处理器调用，防止混响/音乐被应用两次。
- **退出代码泄漏修复** — `play-tts.ps1` 现在明确以代码 0 退出，防止原生命令退出代码（piper、ffmpeg、sox）泄漏并导致误报 TTS 失败。
- **Windows 接收器选项卡平台支持** — Tailscale IP 检测、通过 PowerShell 获取本地 IP、读取 sshd_config 以及复制到剪贴板现在均可在 Windows 上原生工作。
- **`llm:default` 音频效果行** — `audio-effects.cfg` 中的新默认行确保即使没有每 LLM 配置条目，远程接收器也能获得混响、音乐和前置文本。
- **预览示例文本** — 为避免 Piper 对"preview"一词的发音故障已作更改。
