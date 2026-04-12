> 🌐 [English version](../../RELEASE_NOTES.md)

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
