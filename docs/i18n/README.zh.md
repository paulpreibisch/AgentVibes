> 🌐 [English version](../../README.md)

**作者**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **版本**: v4.6.8

---

## 🐛 NEW IN v4.6.8 — 全新安装崩溃修复

- **设置选项卡崩溃修复** — 在未配置语音的全新安装中导航到设置时不再崩溃
- **macOS 测试修复** — 回放路径断言处理 `/var` → `/private/var` 符号链接
- **BMAD 预文本解析改进** — 从 `bmad-voices.md` 正确提取语音预文本

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
