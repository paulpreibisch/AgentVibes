> 🌐 [English version](../../README.md)

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
