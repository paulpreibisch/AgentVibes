> 🌐 [English version](../../README.md)

## 🌟 v4.5 の新機能 — 「あらゆる言語で話す」リリース

### 🌍 多言語 TUI — 9 言語対応

`npx agentvibes` のすべての画面、ボタン、ラベルが完全に翻訳されました：

- **英語、スペイン語、フランス語、ドイツ語、ポルトガル語、日本語、韓国語、中国語（簡体字）、イタリア語**
- 初回起動時に言語を選択 — 最初に言語を選んでから始められます
- 設定の言語サブタブ — 再起動なしでリアルタイムに切り替え可能
- すべてのタブラベル、ボタン、フッターのヒント、ステータスメッセージ、BMAD/Receiverタブが翻訳済み
- 言語ごとの i18n ファイル（`src/i18n/en.js`、`es.js`、`fr.js` など）、英語へのフォールバック付き

### 🪟 Windows セキュリティ強化

- **予測不可能な一時ファイル** — すべての一時ファイル名で `Date.now()` が `randomUUID()` に置き換えられました（JS + PowerShell）
- **シェルインジェクション対策** — `which` 検索で `execSync(..., { shell: true })` が `spawnSync` に置き換えられました
- **スマートな音楽プレーヤー検出** — Windows でハードコードされていた `ffplay` が `detectMp3Player()` に置き換えられました
- **ブール値の修正** — `isWindowsTerminal` が `WT_SESSION` の UUID 文字列ではなく、`true/false` を返すようになりました

### 🎙️ クロスプラットフォーム BMAD Speak

- `bmad-speak.js` — クロスプラットフォームのエントリポイント；Windows では PowerShell へ、Mac/Linux では bash へ自動ルーティング
- `bmad-speak.ps1` — エージェントごとのパーソナリティルーティングを備えたネイティブ Windows BMAD Speak

### 🧪 600 テスト、失敗ゼロ
