> 🌐 [English version](../../README.md)

## 🌟 v4.5 의 새로운 기능 — "모든 언어로 말하기" 릴리스

### 🌍 다국어 TUI — 9개 언어

`npx agentvibes`의 모든 화면, 버튼, 레이블이 이제 완전히 번역되었습니다:

- **영어, 스페인어, 프랑스어, 독일어, 포르투갈어, 일본어, 한국어, 중국어(간체), 이탈리아어**
- 첫 실행 시 언어 선택 — 시작 전에 언어를 먼저 선택하세요
- 설정의 언어 서브탭 — 재시작 없이 실시간으로 전환 가능
- 모든 탭 레이블, 버튼, 하단 힌트, 상태 메시지, BMAD/Receiver 탭이 번역됨
- 언어별 i18n 파일 (`src/i18n/en.js`, `es.js`, `fr.js`, ...), 영어 폴백 포함

### 🪟 Windows 보안 강화

- **예측 불가능한 임시 파일** — 모든 임시 파일 이름에서 `Date.now()`가 `randomUUID()`로 교체됨 (JS + PowerShell)
- **셸 인젝션 방지** — `which` 조회에서 `execSync(..., { shell: true })`가 `spawnSync`로 교체됨
- **스마트 음악 플레이어 감지** — Windows에서 하드코딩된 `ffplay`가 `detectMp3Player()`로 교체됨
- **불리언 수정** — `isWindowsTerminal`이 이제 `WT_SESSION` UUID 문자열 대신 `true/false`를 반환함

### 🎙️ 크로스 플랫폼 BMAD Speak

- `bmad-speak.js` — 크로스 플랫폼 진입점; Windows에서는 PowerShell로, Mac/Linux에서는 bash로 자동 라우팅
- `bmad-speak.ps1` — 에이전트별 퍼소널리티 라우팅이 포함된 네이티브 Windows BMAD Speak

### 🧪 600개 테스트, 실패 없음
