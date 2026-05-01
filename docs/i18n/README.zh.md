> 🌐 [English version](../../README.md)

**作者**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **版本**: v5.6.1

---

## 🌟 v5.6.1 新功能 — Hermes Agent 集成

AgentVibes 现在可以为 **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — 自托管、自我改进的 AI 助手发声。两个生产就绪的技能包含在 `docs/hermes/skills/` 中：

- **`hermes-agentvibes-hook`** — 通过 AgentVibes TTS 自动播报每条 Hermes 响应。在 `agent:end` 触发，去除 Markdown，限制速率，并提供完整的 SSH MITM 防护
- **`agentvibes-target`** — 教 Hermes 按需将任意文本发送到您的扬声器，支持 Windows 和 Android

本次发布还包括：`play-tts.ps1` 的 PS5.1 兼容性修复、模态框/快捷键修复、BMAD 选项卡现在显示所有代理。

## v5.5 新功能 — 每 LLM 音频路由

为**每个 LLM 设置独立的语音、前缀文本和音乐** — Claude Code、Copilot 和 Codex 可以呈现不同的声音，无需修改全局设置。

- 向 `audio-effects.cfg` 添加 `llm:<name>|...|voice|pretext|engine` 行
- MCP 服务器自动检测哪个 LLM 正在调用，并传递 `--llm <key>`
- 通过 TUI 的 **Setup → Default → Configure** 进行配置

同时修复：在安装了旧版全局 AgentVibes 的情况下，Windows **重新安装**时的安装程序崩溃（`spinner.info is not a function`）。

---

**🎛️ v5.4.0 新功能 — TUI 安装程序与修复：**
- 🖥️ **TUI 安装程序** - 交互式终端 UI：浏览语音、配置提供商、启用 BMAD 派对模式
- 🔧 **Spinner 修复** - 解决了 WSL/Linux 上的 `spinner.info is not a function` 崩溃问题
- 🐛 **循环依赖修复** - 移除了静默破坏安装的自引用 `agentvibes@^3.5.9` 依赖
- 🎵 **背景音乐音量修复** - 恢复了 `audio-processor.sh` 中的 `bg_volume="0.20"` 回退值
- 📂 **PROJECT_ROOT 修复** - `play-tts.sh` 现在能正确解析项目根目录以使用项目配置

## 🎯 NEW IN v5.3.0 — 掌控远程语音

- **每条远程通知都可单独定制** — 在命令行上传入 `--voice`、`--pretext`、`--music`、`--volume`、`--effects`、`--speed`、`--provider`，仅对这一条消息生效。不再需要改配置文件然后再改回来。
- **按需跳过前缀短语** — `--pretext ""` 可针对单条消息禁用前缀。
- **Windows 上长消息和特殊字符正确处理** — 带引号、撇号、表情符号或多行内容的文本在送往语音引擎时不再被截断。
- **无显示器的 Windows 服务器上语音播放可正常工作** — 一个后台小助手运行在你的用户会话中，从队列中取出通知，即使是无头 SSH 登录也能播放音频。
- **远程服务器的语音预览正确流式传输到目标设备** — 在没有扬声器的机器上，TUI 预览不再回退到本地音频。
- **不再出现双重前缀短语** — 当发送端和接收端都配置了前缀时。
- **55 个新测试** — 覆盖 BMAD 派对模式的语音分配与代理隔离。

## 🎯 v5.2.1 — 多 LLM 身份识别与安装优化

- **Copilot 拥有自己的语音 + 前缀 + 音乐** — 博萨诺瓦节奏中的 "Copilot here"，与 Claude Code 和 Codex 完全区分。
- **每工具的 MCP 配置都带有明确的身份** — `.vscode/mcp.json`、`.codex/config.toml`、`~/.copilot/mcp-config.json` 各自设置自己的 `AGENTVIBES_LLM`。
- **MCP 工具 `get_config` 返回检测到的 LLM** — 助手可以确认其路由并用正确的声音响应。
- **设置导航：安装 → 安装 → 安装 → 配置 → 配置 → 配置** — 键盘流程在到达默认项之前依次走完三个配置。
- **Claude Code 的默认背景音乐**设置为 Chillwave。
- **Linux 兼容性优化** — CRLF、权限、传输提供程序覆盖。

## 🎯 NEW IN v5.2.0 — 远程语音预览 + 穴居人模式 + 语音评分

- **穴居人详细度模式** — 超简洁 TTS 片段输出。通过 `/agent-vibes:verbosity caveman` 设置。
- **👍/👎 语音评分** — 在任意语音列表中按 `+` 点赞、`-` 差评。取代星标收藏。
- **远程语音预览** — TUI 语音预览通过 SSH 接收器在无头服务器上工作。无需本地音频。
- **SSH 接收器路由** — `ssh-remote` 和 `agentvibes-receiver` 现已成为一级提供商。
- **语音验证加固** — 多说话者 `::` 格式、跨平台 base64、无反斜杠注入。

---

## 🛡️ v5.1.4 — TTS 弹性全面改造 + 默认 LLM 提供商

- **默认 LLM 提供商** — Setup → 提供商页面底部的新备用条目。仅配置。
- **每个 LLM 的背景音乐自动启用** — 在每个 LLM 的 Configure 模态中设置背景音轨现在会真正播放。
- **Copilot CLI 支持** — `installCopilotMcp` 现在同时写入 `.vscode/mcp.json` 和 `~/.copilot/mcp-config.json`。
- **每客户端路由架构** — `.mcp.json` 不再设置 `AGENTVIBES_LLM`。Claude Code 通过 `CLAUDECODE=1` 环境变量自动检测。
- **自愈 TTS 互斥锁** — 卡住的 `play-tts.ps1` 进程会被下一个调用者自动终止。25 秒看门狗保证前进。
- **不再有过期音频重播** — `play-tts.ps1` 从提供商 stdout 捕获确切的输出文件名。
- **每个 LLM 语音优先于显式 `VoiceOverride`** — 已修复。
- **codex 默认 `lessac-medium` → `lessac-high`**。
- **暂存文件重命名 + 仅 ASCII 编码**。
- **Setup → 安装确认** 现在将焦点推进到下一个提供商行。

---

## 🎙️ NEW IN v5.1.0 — 语音选择器重做 + 代理模态框自动保存

- **代理模态框自动保存** — 语音/人格/音乐/混响/预文本更改在编辑时自动保存。简短的"✓ 已保存!"提示确认每次更改。
- **LibriTTS 独特姓名** — 904 位说话者获得确定性的姓氏：**Anna Bell**、**Anna Carter**、…、**Anna Quinn**。不再有"Anna-2"、"Anna-3"重复。
- **粉色 ♀ / 浅蓝 ♂ 性别符号** — 主 Voices 选项卡和所有语音选择器模态框中的彩色性别指示器。
- **首字母快速跳转** — 在任何语音选择器中按 `a`–`z` 跳转到该字母。`q`、`j`、`k`、`g`、`h`、`l` 为导航/取消保留。
- 语音选择器中的 **PgUp / PgDn / Home / End**
- **3 首新背景音乐** — Late Night Hip Hop Groove、Drifting Down the Hall、Midnight Charleston Stomp
- **从语音选择器中删除搜索栏** — 替换为首字母跳转（更快、无焦点问题）
- **Voices 选项卡损坏修复** — 导航到未安装行时不再丢失其供应商列
- **Music + Voices 选项卡闪烁伪影消除**

---

## 🚀 v5.0.0 — 多供应商支持: Claude Code + Copilot + Codex

- **GitHub Copilot + OpenAI Codex（VS Code）** — AgentVibes 现已支持三大 AI 编程助手。通过 TUI 安装和配置每个供应商。
- **统一设置选项卡** — 4 步向导（语言 → 依赖项 → TTS 引擎 → 供应商）取代旧的安装程序 + LLM 选项卡。老用户直接跳转到供应商。
- **按供应商配置音频** — 每个 LLM 通过配置模态框拥有独立的语音、TTS 引擎、混响、音乐和预文本。
- **设置重新设计** — 简洁的平面列表：语言、TTS 引擎、语音、详细程度、音频输出、配置存储、重新运行向导。
- **语音选择器升级** — 3 列显示，空格键预览，滚动位置保持不变。

---

## 🎙️ v4.6.7 — 派对模式 TTS 修复

- **派对模式中代理预文本现已朗读** — "John, Product Manager here"因预合成时序错误而被静默丢弃，已修复
- **不再朗读星号** — 派对模式中 TTS 前去除 markdown
- **Windows 会话启动 TTS 修复** — 钩子现在输出正确的 JSON，使 TTS 在会话启动时可靠激活
- **PreToolUse 钩子不再报错** — grep/regex 命令不再出错

---

## 🧭 v4.6.6 — 自然 TUI 导航

设置 TUI 现在按预期方式运行。下键按顺序在标题栏 → 子选项卡 → 内容 → 页脚之间移动。左右键切换子选项卡并在页脚按钮间移动。从内容区按上键返回当前活动的子选项卡——而非始终返回 Voice。语言选项卡新增可滚动列表。当本地文件不存在时，Readme 回退到 AgentVibes 包的 README。从安装程序按 Escape 不再卡住。

---

## 🌟 v4.5 新功能 — "畅言万语"发布版

### 🌍 多语言 TUI — 9 种语言

`npx agentvibes` 中的每个界面、按钮和标签现已完全翻译：

- **英语、西班牙语、法语、德语、葡萄牙语、日语、韩语、中文（简体）、意大利语**
- 首次启动时选择语言 — 在开始之前先选择您的语言
- 设置中的语言子选项卡 — 实时切换，无需重启
- 所有选项卡标签、按钮、底部提示、状态消息以及 BMAD/Receiver 选项卡均已翻译
- 每种语言的 i18n 文件（`src/i18n/en.js`、`es.js`、`fr.js` 等），提供英语回退

### 🪟 Windows 安全加固

- **不可预测的临时文件** — 所有临时文件名中的 `Date.now()` 已替换为 `randomUUID()`（JS + PowerShell）
- **防止 Shell 注入** — `which` 查找中的 `execSync(..., { shell: true })` 已替换为 `spawnSync`
- **智能音乐播放器检测** — Windows 上硬编码的 `ffplay` 已替换为 `detectMp3Player()`
- **布尔值修复** — `isWindowsTerminal` 现在返回 `true/false`，而不是 `WT_SESSION` UUID 字符串

### 🎙️ 跨平台 BMAD Speak

- `bmad-speak.js` — 跨平台入口点；在 Windows 上自动路由到 PowerShell，在 Mac/Linux 上路由到 bash
- `bmad-speak.ps1` — 具有按代理人格路由的原生 Windows BMAD Speak

### 🧪 600 个测试，零失败
