> 🌐 [English version](../../RELEASE_NOTES.md)

## 🐛 v4.6.8 — 全新安装崩溃修复

**发布日期：** 2026年4月

### 错误修复

- **设置选项卡在全新安装时不再崩溃** — 当尚未配置语音时，`parseMultiSpeaker()` 对 null 的语音 ID 调用了 `.includes()`。已添加 null 守卫，返回安全的默认对象。此问题由一位在安装向导完成后立即遇到此问题的用户报告。

- **macOS /var 符号链接导致的回放测试问题** — 修复了在 macOS 上由于 `/var` 是指向 `/private/var` 的符号链接，导致回放路径比较失败的测试断言。

- **BMAD 语音 pretext 解析** — `bmad-voices.md` 的 pretext 行现在可以正确解析，TTS 合成前的 Markdown 去除也更加彻底。

### 用户影响

- 新用户在全新安装后导航到设置时不再崩溃
- 测试套件在 macOS 上可靠通过

---

## 🌍 v4.5.0 — "畅言万语"发布版

**发布日期：** 2026年4月

全面支持9种语言的多语言 TUI，完整的 Windows 安全加固，以及零测试失败。

### 🌍 多语言 TUI — 9 种语言

`npx agentvibes` TUI 中的每个界面、选项卡、按钮和标签现已完全翻译：

- **英语、西班牙语、法语、德语、葡萄牙语、日语、韩语、中文（简体）、意大利语**
- 首次启动时选择语言（安装向导的第 0 屏）
- 设置中的语言子选项卡 — 无需重启即可实时切换语言
- 所有选项卡栏标签、按钮文字、底部提示和状态消息均已翻译
- BMAD 选项卡和 SSH Receiver 选项卡完全本地化
- 每种语言的 i18n 文件，提供英语回退

### 🪟 Windows 安全与错误修复

- **临时文件名** — 所有 `Date.now()` 临时文件名替换为 `randomUUID()`（不可预测，防止临时文件劫持）
- **Shell 注入** — `execSync('which ...', { shell: true })` 替换为 `spawnSync`
- **音乐播放器** — Windows 上硬编码的 `ffplay` 替换为 `detectMp3Player()`
- **布尔值强制转换** — `isWindowsTerminal` 现在正确返回 `true/false`，而不是泄露 `WT_SESSION` UUID 字符串

### 🎙️ 跨平台 BMAD Speak

- `bin/bmad-speak.js` — BMAD 代理语音的跨平台入口点
- `.claude/hooks-windows/bmad-speak.ps1` — 具有按代理人格路由的原生 Windows BMAD Speak

### 🧪 测试套件

- 600 个测试，0 个失败

---

## 🐛 v4.5.1 — 补丁发布

**发布日期：** 2026年4月

### 错误修复

- **音乐选项卡预览** — 在全新目录中运行 `npx agentvibes` 时，在音乐选项卡中对某首曲目按下空格键现在
  可以正确播放。此前，如果当前工作目录中不存在 `.claude/audio/tracks/`，曲目列表会显示内置曲目，但
  按空格键没有任何反应（播放器针对一个不存在的路径启动）。现在会自动回退到软件包自带的曲目目录。
