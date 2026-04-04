> 🌐 [English version](../../README.md)

**저자**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **버전**: v4.6.8

---

## 🐛 NEW IN v4.6.8 — 신규 설치 시 크래시 수정

- **설정 탭 크래시 수정** — 음성이 설정되지 않은 신규 설치에서 설정 탭으로 이동할 때 더 이상 크래시가 발생하지 않습니다
- **macOS 테스트 수정** — 리플레이 경로 어설션이 `/var` → `/private/var` 심볼릭 링크를 처리
- **BMAD 프리텍스트 파싱 개선** — `bmad-voices.md`에서 음성 프리텍스트가 올바르게 추출됩니다

---

## 🎙️ v4.6.7 — 파티 모드 TTS 수정

- **파티 모드에서 에이전트 프리텍스트 발화** — "John, Product Manager here"가 프리신세시스 타이밍 버그로 무음 처리되던 문제 수정
- **별표가 더 이상 읽히지 않음** — 파티 모드에서 TTS 전에 마크다운 제거
- **Windows 세션 시작 TTS 수정** — 훅이 적절한 JSON을 출력하여 세션 시작 시 TTS가 안정적으로 작동
- **PreToolUse 훅 오류 해결** — grep/regex 명령에서 더 이상 오류가 발생하지 않습니다

---

## 🧭 v4.6.6 — 자연스러운 TUI 내비게이션

설정 TUI가 이제 기대대로 동작합니다. 아래 키로 헤더 → 서브탭 → 콘텐츠 → 푸터 순서로 이동합니다. 좌우 키로 서브탭 전환과 푸터 버튼 간 이동이 가능합니다. 콘텐츠에서 위 키를 누르면 항상 Voice가 아닌 활성 서브탭으로 돌아갑니다. 언어 탭에 스크롤 가능한 목록이 추가되었습니다. Readme는 로컬 파일이 없을 때 AgentVibes 패키지 README로 폴백합니다. 인스톨러에서 Escape 키가 더 이상 멈추지 않습니다.

---

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
