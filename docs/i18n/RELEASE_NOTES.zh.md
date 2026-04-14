> 🌐 [English version](../../RELEASE_NOTES.md)

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
