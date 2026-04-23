> 🌐 [English version](../../RELEASE_NOTES.md)

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
