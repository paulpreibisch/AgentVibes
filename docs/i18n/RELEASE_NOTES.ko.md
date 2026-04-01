> 🌐 [English version](../../RELEASE_NOTES.md)

## 🌍 v4.5.0 — "모든 언어로 말하기" 릴리스

**릴리스 날짜:** 2026년 4월

전체 9개 언어에 걸친 완전한 다국어 TUI 지원, 완전한 Windows 보안 강화, 그리고 실패한 테스트 없음.

### 🌍 다국어 TUI — 9개 언어

`npx agentvibes` TUI의 모든 화면, 탭, 버튼, 레이블이 이제 완전히 번역되었습니다:

- **영어, 스페인어, 프랑스어, 독일어, 포르투갈어, 일본어, 한국어, 중국어(간체), 이탈리아어**
- 첫 실행 시 언어 선택 (설치 마법사의 화면 0)
- 설정의 언어 서브탭 — 재시작 없이 실시간으로 언어 전환
- 탭 바 레이블, 버튼 텍스트, 하단 힌트, 상태 메시지 모두 번역됨
- BMAD 탭 및 SSH Receiver 탭 완전 현지화
- 언어별 i18n 파일, 영어 폴백 포함

### 🪟 Windows 보안 및 버그 수정

- **임시 파일 이름** — 모든 `Date.now()` 임시 파일 이름이 `randomUUID()`로 교체됨 (예측 불가능, 임시 파일 하이재킹 방지)
- **셸 인젝션** — `execSync('which ...', { shell: true })`가 `spawnSync`로 교체됨
- **음악 플레이어** — Windows에서 하드코딩된 `ffplay`가 `detectMp3Player()`로 교체됨
- **불리언 강제 변환** — `isWindowsTerminal`이 `WT_SESSION` UUID 문자열을 노출하는 대신 올바르게 `true/false`를 반환함

### 🎙️ 크로스 플랫폼 BMAD Speak

- `bin/bmad-speak.js` — BMAD 에이전트 음성의 크로스 플랫폼 진입점
- `.claude/hooks-windows/bmad-speak.ps1` — 에이전트별 퍼소널리티 라우팅이 포함된 네이티브 Windows BMAD Speak

### 🧪 테스트 스위트

- 600개 테스트, 0개 실패
