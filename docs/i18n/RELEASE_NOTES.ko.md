> 🌐 [English version](../../RELEASE_NOTES.md)

## 🔧 v5.7.6 — SSH 원격 페이로드 무결성 + 수신기 재작성

**출시일:** 2026-05-16

### 🐛 SSH 원격에서 잘못된 음악과 음성 재생

SSH 원격 TTS 기능을 사용할 때 잘못된 프로젝트의 음악 트랙과 음성이 적용되었습니다. 근본 원인: `CLAUDE_PROJECT_DIR`이 전송자에게 전달되지 않아 활성 프로젝트의 `audio-effects.cfg` 대신 전역 구성이 사용되었습니다.

### 🐛 JSON 페이로드 형식과 호환되지 않는 Bash 수신기

Linux/Termux bash 수신기(`agentvibes-receiver.sh`)는 v5.5 이전의 위치 인수 형식을 사용하여 현재 base64 JSON 페이로드를 전혀 디코딩할 수 없었습니다. 수신기는 PowerShell 수신기의 로직에 맞게 완전히 재작성되었습니다: base64를 디코딩하고, JSON을 파싱하고, 음성/음악/효과/볼륨을 적용하고, 모든 필드를 검증합니다.

### 🐛 원격에서 개성 인트로가 두 번 들림

SSH 원격 TTS 사용 시 개성 pretext(예: "Bcs latin dance here")가 두 번 말해졌습니다. 근본 원인: `play-tts.sh`가 이미 전송자를 호출하기 전에 pretext를 음성 텍스트에 추가하고 있었는데, 전송자도 JSON `pretext` 필드에 패킹하여 수신기가 다시 추가하게 했습니다. JSON `pretext` 필드는 이제 의도적으로 비워둡니다 — 개성은 `text` 필드를 통해서만 전달됩니다.

### 🆕 설정 탭에 SSH 호스트 별칭 표시

구성된 SSH 원격 호스트 별칭이 이제 설정 및 음성 탭에 표시되어 사용자가 구성 파일을 열지 않고도 TTS가 대상으로 하는 원격 컴퓨터를 확인할 수 있습니다.

### 🔒 보안 수정

SSH 원격 전송자 및 수신기의 입력 유효성 검사 개선.

### 🧪 24개의 새로운 BATS 테스트

- 15개의 SSH 원격 페이로드 테스트: 음성, 음악 트랙, 볼륨, 리버브/효과, pretext 처리, LLM 식별자, 프로젝트 구성 우선순위, JSON 유효성 검증
- 9개의 엔드투엔드 왕복 테스트: 전송자가 페이로드 구축 → 수신기가 모든 필드를 동시에 디코딩하고 적용하여 양쪽 끝의 회귀를 포착

---

## 🖥️ v5.7.5 — TUI 버튼 대비 + BMAD 라우팅 수정

**출시일:** 2026-05-13

### 🐛 TUI 버튼 포커스: 모든 터미널에서 회색 텍스트 제거

TUI(음성, 음악, 설정, 설치 탭)의 포커스되거나 선택된 버튼이 많은 터미널에서 연한 파란색 배경에 연한 회색 텍스트를 표시했습니다. 근본 원인: `bold: true`와 어두운 전경색의 조합이 터미널의 "밝은 모드"를 활성화하여 정확한 색조에 관계없이 회색으로 렌더링됩니다.

**수정:** 모든 버튼 포커스 상태가 이제 **진한 녹색 배경(`#2e7d32`)에 흰색 텍스트**를 사용합니다 — 에이전트 탭에서 이미 사용하는 동일한 고대비 패턴입니다. `attachBtnBlink`가 blessed의 수동 `style.focus` 색상 적용을 방해하지 않도록 setup-tab 모달 버튼에 명시적 `focus`/`blur` 핸들러가 추가되었습니다.

### 🐛 BMAD 탭 음성 선택기 ♪ 표시기가 표시되지 않음

BMAD 탭 음성 목록의 ♪ 미리보기 표시기가 미리보기 중에 나타나지 않았습니다. 에이전트 탭에는 설정 탭이 이미 가진 `_refreshVP()` 호출이 없었습니다. SSH-remote가 즉시 종료될 때(fire-and-forget 모드) 표시기를 2초 최소 표시 타이머로 계속 표시합니다.

### 🐛 비인터랙티브 설치: 프로젝트 이름 대신 일반 프리텍스트

`agentvibes install`을 비인터랙티브로 실행하면 프로젝트에 관계없이 항상 프리텍스트가 `"Claude Code here"`로 설정되었습니다. 이제 설치 프로그램이 `path.basename(process.cwd())`에서 대문자화와 함께 프로젝트 인식 프리텍스트를 도출합니다(예: `"MyProject here"`). Docker 루트 경로에는 안전한 폴백이 있습니다.

### 🐛 전역 프리텍스트가 프로젝트별 구성을 재정의

`seedAllLlmDefaultsSync`가 전역 프리텍스트 문자열로 프로젝트 레벨 LLM 행을 시드하여 전역 `"Claude Code here"`가 프로젝트별 `tts-pretext.txt` 값을 재정의했습니다. 프로젝트 레벨 행은 이제 빈 프리텍스트로 시드되어 프로젝트별 파일이 우선합니다.

### 🐛 `screen`/`tmux` TERM 변형이 `plab_norm` 기능 오류 유발

`TERM`이 `screen-*` 또는 `tmux-*` 변형으로 설정된 경우, blessed가 시작 시 `plab_norm` 터미널 기능 오류를 던졌습니다. 이제 앱은 이러한 변형이 감지될 때 blessed 화면을 만들기 전에 `TERM`을 `xterm-256color`로 재정의합니다.

### 🐛 BMAD 에이전트별 음악/리버브가 SSH 수신기에 도달하지 않음

`play-tts.sh`가 `AGENT_PROFILE_FILE`을 SSH 원격 전송으로 전달하지 않아 BMAD 탭의 에이전트별 배경 음악 및 리버브 재정의가 원격 오디오에 대해 자동으로 무시되었습니다. 이제 프로필 파일 경로가 `play-tts-ssh-remote.sh`의 인수 4로 전달됩니다.

### 🐛 Node 18 호환성: `import.meta.dirname` 교체

테스트 파일이 Node 21+에서만 사용 가능한 `import.meta.dirname`을 사용했습니다. Node 18 및 20에서 테스트가 올바르게 실행되도록 `fileURLToPath(import.meta.url)` 패턴으로 교체되었습니다.

---

## 🎭 v5.7.0 — BMAD v6.6 지원 + Windows 워처 자동 재시작

**출시일:** 2026-05-11

### 🆕 BMAD v6.6.0 호환성

BMAD v6.6은 에이전트 위치를 재구성했습니다 — `_bmad/bmm/agents/`에서 `.claude/skills/*/agents/`로 이동되었습니다. AgentVibes는 이제 이러한 새로운 경로를 올바르게 감지하고 스캔합니다.

**TTS 주입**은 오류를 발생시키는 대신 v6.6+ 에이전트(XML/YAML 활성화 섹션이 없는 일반 Markdown 사용)를 정상적으로 건너뜁니다. 설치 요약에 이제 건너뛴 에이전트 수와 수정된 에이전트 수가 명확하게 표시됩니다.

**BMAD 탭 감지**는 이제 프로젝트 로컬 설치 외에 `~/_bmad`(홈 디렉터리 설치)에 전역적으로 설치된 BMAD를 찾습니다. 이전에는 BMAD가 전역적으로 설치되어 있어도 BMAD 탭이 "감지되지 않음"을 표시했습니다.

**보안:** 설치 관리자의 경로 유효성 검사가 이제 사용자 홈 디렉터리 아래의 BMAD 경로를 올바르게 허용하여 전역 설치에서 발생하는 "유효하지 않은 BMAD 경로" 오탐지를 수정합니다.

### 🆕 Windows TTS 워처 — 독립 실행형 파일 + 자동 재시작

`tts-watcher.ps1`은 이제 `~/.agentvibes/tts-watcher.ps1`에 독립 실행형 파일로 추출됩니다. `npx agentvibes update`를 실행하면 이제 최신 워처를 복사**하고** 자동으로 재시작합니다 — 파일과 프로세스 모두 한 번에 업데이트되며 수동 재시작이 필요하지 않습니다.

### 🐛 Windows 공급자 재정의가 노트북에서 적용됨

`play-tts.ps1`은 이제 SSH를 통해 오디오를 수신할 때 Linux 측 구성에서 `ProviderOverride` 설정을 읽습니다. 이전에는 서버가 다른 공급자를 지정해도 노트북은 항상 로컬로 구성된 공급자를 사용했습니다.

### 🐛 음성 관리자에 Sample 명령 추가

`voice-manager.sh sample`에 핸들러가 없어 호출 시 사용법/종료 경로로 조용히 폴백했습니다. 수정됨.

### 🐛 미리 보기 SSH 라우팅이 올바른 엔드포인트를 감지

`provider-manager.sh`에 이제 `detect_routing_llm()`이 포함되어 `AGENTVIBES_LLM_KEY`를 확인한 후 `transport-config.json`에서 첫 번째 `mode=remote` 항목을 찾으므로 미리 보기 오디오가 올바른 SSH 호스트에 도달합니다.

---

## 🔇 v5.6.9 — NPX 설치에서 리버브 및 배경 음악 무음

**출시일:** 2026-05-09

### 🐛 모든 NPX 사용자에게 리버브 및 배경 음악이 무음으로 설정됨

`npx`를 통해 AgentVibes를 설치하면 후크 파일이 npm 패키지에서 644 권한(실행 비트 없음)으로 추출됩니다. `play-tts-piper.sh`는 `audio-processor.sh`를 직접 호출했는데, 실행 불가능한 파일에서는 코드 126(권한 거부)으로 즉시 종료됩니다. `npx`로 설치한 모든 사용자는 리버브도 배경 음악도 없는 음성만의 TTS를 받았습니다.

**수정 1:** `play-tts-piper.sh`가 이제 `bash "$SCRIPT_DIR/audio-processor.sh"`를 통해 `audio-processor.sh`를 호출하여 실행 비트 확인을 우회합니다.
**수정 2:** `install-deps.js`(postinstall)가 이제 npm install 후 모든 `.sh` 파일에 `chmod 755`를 적용하는 `ensureHookPermissions()`를 실행합니다.

### 🐛 보이스 브라우저 미리보기가 리버브 및 배경 음악 무시

보이스 브라우저의 **미리보기** 버튼이 `audio-processor.sh`를 완전히 건너뛰고 리버브나 배경 음악 없이 원시 piper 출력을 재생했습니다.

**수정:** 미리보기 오디오가 이제 실제 TTS와 동일한 `audio-processor.sh` 파이프라인을 통해 처리됩니다.

### 🐛 MCP `text_to_speech`가 손상된 파일 경로와 누락된 음성 정보 반환

도구가 오디오 파일 경로를 잘못 추출했으며(후행 크기/이모지 문자 포함), 응답에 음성 이름을 보고하지 않았습니다.

**수정:** 파싱 전에 ANSI 코드를 제거하고, `.wav` 경로를 정확하게 추출하며, `🎤 사용된 음성:` 줄을 도구 응답에 포함합니다.

### 🐛 TUI 배경 음악 토글이 효과 없음

**음악** 탭에서 배경 음악을 활성화하면 `config.json`에는 쓰지만 bash 후크가 읽는 `background-music-enabled.txt`에는 쓰지 않았습니다. 토글 후에도 음악이 비활성화된 채로 유지됐습니다. 이제 트랙 저장도 음악 활성화를 의미합니다.

---

## 🐧 v5.6.8 — WSL 보이스 라우팅 수정 + 세션 라이프사이클 안정성

**릴리스:** 2026-05-09

### 🐛 WSL: 설정된 보이스가 재생됨 (lessac 폴백 해소)

WSL 세션에서 설정된 보이스와 상관없이 `en_US-lessac-medium`이 재생되었습니다. 근본 원인: `pipx`는 Piper를 `~/.local/bin/`에 설치하는데, 인터랙티브 셸은 `.bashrc`/`.zshrc`를 통해 이 경로를 가져옵니다. 하지만 Claude Code의 Bash 도구 호출은 비인터랙티브로 실행되어 프로파일 소싱을 건너뛰기 때문에 `command -v piper`가 실패하여 기본 보이스로 폴백했습니다.

**수정:** `play-tts-piper.sh`가 이제 바이너리 검사 전에 `~/.local/bin`과 pipx Piper venv bin을 `PATH` 앞에 추가하여 셸 모드와 관계없이 Piper를 찾을 수 있습니다.

### 🐛 `CLAUDE_PROJECT_DIR`이 Bash 환경에 없을 때 프로젝트별 보이스/음악이 사라지는 문제

Claude Code가 Bash 도구 호출을 실행할 때 `CLAUDE_PROJECT_DIR`이 환경에 전달되지 않습니다. TTS 훅이 프로젝트별 설정을 찾을 수 없어 전역 기본값으로 폴백했고, 잘못된 보이스·음악·프리텍스트가 재생되었습니다.

**수정:** `session-start-tts.sh`(및 `.ps1`)가 이제 주입된 훅 명령에 프로젝트 디렉토리를 `--project-dir`로 굽습니다. `play-tts.sh`는 설정 조회 전에 이 플래그를 읽으므로 모든 Bash 도구 호출에서 프로젝트별 라우팅이 안정적으로 동작합니다.

### 🐛 `play-tts-piper.sh`와 `play-tts-piper.ps1`이 `agentvibes install`로 배포되지 않는 문제

이 훅들이 `CRITICAL_HOOKS` / `CRITICAL_HOOKS_WINDOWS`에 없어서 `agentvibes install`이 업데이트된 버전을 `~/.claude/hooks/`에 반영하지 않았습니다.

**수정:** 두 파일 모두 크리티컬 훅 목록에 추가되어 인스톨/업데이트 시 항상 배포됩니다.

### 🐛 보이스 표시 이름 버그

- `uniquifyVoiceName("Mary-1")`이 `"Mary Bell"` 대신 `"Mary-1 Bell"`을 반환했습니다.
- `Rose_Ibex`와 같은 16Speakers 이름에 성(姓)이 잘못 추가되었습니다(`"Rose Ibex Bell"`).
- WSL bash 출력에서 `🎤 Voice used:` 줄이 누락되었습니다.

세 가지 모두 수정되었습니다. 새 테스트 파일(`test/unit/voice-names.test.js`, 16개 테스트)이 이 케이스들을 커버합니다.

---

## 🪟 v5.6.7 — Windows 미리 듣기 버튼 수정

**릴리스:** 2026-05-08

### 🐛 Windows에서 미리 듣기 버튼이 이제 올바르게 작동합니다

Windows에서 LLM별 오디오를 설정할 때 **미리 듣기**를 클릭하면 잘못된 보이스(Windows SAPI 기본값)가 재생되고 배경 음악이나 리버브가 적용되지 않았습니다. 이제 설정한 보이스, 리버브, 배경 트랙이 정확하게 재생됩니다.

### 🧪 회귀 테스트 추가

두 개의 새로운 Windows CI 테스트가 미리 듣기 설정 조회를 검증합니다 — 향후 릴리스에서 조용히 회귀하는 일이 없어집니다.

---

## 🔇→🎵 v5.6.6 — npm link 및 글로벌 설치에서 배경 음악 미리 듣기 수정

**릴리스:** 2026-05-08

### 🐛 미리 듣기에서 배경 음악이 조용히 사라짐 (npm link / 글로벌 설치)

배경 트랙이 설정된 상태에서 LLM 구성 모달의 **Preview**를 클릭하면, AgentVibes가 로컬 의존성으로 설치되지 않은 경우 음성만 들리고 음악은 재생되지 않았습니다. 설치 방식과 관계없이 수정되었습니다.

**근본 원인:** `npm link` 및 글로벌 설치 환경에서 `rsync --delete`를 사용하는 동기화 스크립트가 패키지 디렉토리에서 `background-music-enabled.txt`를 주기적으로 삭제했습니다(이 파일은 .gitignore에 포함됨). 삭제 후 `audio-processor.sh`가 음악이 비활성화된 글로벌 설정으로 폴백하여 무음 상태가 되었습니다.

**수정:** `audio-processor.sh`가 이제 `CLAUDE_PROJECT_DIR/.claude/config/background-music-enabled.txt`를 **먼저** 확인합니다. TUI Preview도 (패키지 디렉토리가 아닌) 프로젝트 디렉토리에 플래그를 기록하므로, 패키지 디렉토리 동기화 후에도 설정이 유지됩니다.

### 🐛 npm link / 글로벌 설치에서 LLM별 구성을 찾을 수 없음

동일한 환경에서 프로젝트가 AgentVibes 패키지 자체가 아닌 경우, `audio-processor.sh`가 LLM별 오디오 구성(음성, 리버브, 배경 트랙)을 찾을 수 없었습니다.

**수정:** 스크립트가 패키지 구성으로 폴백하기 전에 `CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg`를 먼저 검색합니다.

### 🐛 올바르게 구성했음에도 배경 트랙 "찾을 수 없음"

배경 트랙이 구성되어 있어도 AgentVibes가 글로벌 설치 또는 `npm link`를 통해 설치된 경우, 패키지 디렉토리만 검색하여 트랙 파일을 찾을 수 없었습니다.

**수정:** `audio-processor.sh`가 패키지 디렉토리에 트랙이 없을 때 `CLAUDE_PROJECT_DIR/.claude/audio/tracks/`도 검색하도록 변경되었습니다.

### 🐛 LLM 구성 행 파싱 — 볼륨이 여분의 열을 흡수

TUI가 기록하는 형식인 전체 7열 LLM 행에서, 볼륨 필드가 모든 후행 열을 흡수했습니다. ffmpeg가 잘못된 볼륨 문자열을 받아 조용히 음성만 재생되는 오디오로 폴백했습니다.

**수정:** 파서가 숫자 볼륨 필드만 캡처하고 여분의 열은 `_rest`에 남기도록 수정되었습니다.

### 🧪 Windows CI 테스트 스위트

Windows 네이티브 테스트가 이제 Linux BATS 스위트와 나란히 CI에서 실행되어, Windows 특정 경로가 조용히 회귀하지 않도록 퍼블리싱을 게이팅합니다.

---

## 🛡️ v5.6.4 — 제거 기능의 심각한 보안 수정

**릴리스:** 2026-05-08

### 🐛 `--global` 제거 시 ~/.claude/가 더 이상 삭제되지 않습니다

`--global` 옵션을 사용하면 제거 프로그램이 AgentVibes가 소유한 경로만 삭제하는 대신 `~/.claude/`를 재귀적으로 삭제하고 있었습니다. 이로 인해 설정, CLAUDE.md, 스킬, 플러그인, MCP 구성, 사용자 지정 도구 등 모든 데이터가 손실되었습니다. 실제 문제로 확인되었으며 수정되었습니다.

**v5.6.4는 정밀한 제거를 수행합니다 — AgentVibes가 설치한 경로만:**

- `~/.claude/hooks/`, `hooks-windows/`, `commands/agent-vibes/`, `personalities/`, `audio/`
- `~/.agentvibes/` — AgentVibes가 완전히 소유하며, 전체 삭제
- `settings.json`, `CLAUDE.md`, 스킬, 플러그인, MCP 구성 — **변경 없음**

회귀 테스트가 이제 CI에서 이를 강제합니다. 누군가 광범위한 삭제를 다시 도입하면 빌드가 실패합니다:

```js
// issue #182 regression guard
assert: settings.json and CLAUDE.md survived --global uninstall
```

이것은 조용히 회귀할 수 없습니다 — 먼저 빌드가 깨집니다.

---

## 🌟 v5.6.3 — AgentVibes, Hermes 지원 + 더 쉬워진 원격 설정

**릴리스:** 2026-05-07

### 🎉 AgentVibes가 이제 Hermes와 함께 작동합니다

**[Hermes](https://github.com/NousResearch/hermes-agent)**는 GitHub에서 가장 인기 있는 오픈소스 AI 에이전트 중 하나로 — 21,000개 이상의 별을 보유하며 계속 성장하고 있습니다. AgentVibes가 이제 바로 통합됩니다: Hermes가 응답을 완료하면 AgentVibes가 자동으로 스피커를 통해 소리 내어 읽어줍니다. 포함된 훅 설치 외에 추가 설정이 필요 없습니다.

### 🎉 LLM별 오디오 출력 — 목소리가 나오는 곳 선택

AgentVibes에서 LLM(Claude Code, Copilot, Codex 또는 Hermes)을 구성할 때, 각각에 고유한 **음성, 리버브 스타일, 배경 음악, 인트로 프리픽스**를 설정할 수 있었습니다. 이제 LLM별로 **오디오 목적지**도 설정할 수 있습니다:

- **로컬** — 작업 중인 컴퓨터의 스피커로 재생
- **원격** — 원격 서버에서 작업하거나 클라우드에서 Hermes를 실행하는 동안 다른 기기(예: 노트북)로 오디오 전송

### 🎉 SSH 별칭 선택기 — 더 이상 경로를 직접 입력할 필요 없음

원격 오디오 설정에는 이전에 SSH 경로를 직접 입력해야 했습니다. 이제 **AgentVibes TUI 안에 드롭다운 메뉴**가 생겼으며, 이미 머신에 있는 SSH 별칭을 읽어옵니다. 스피커가 연결된 것을 선택하면 끝입니다. 로컬이든 원격이든 음성이 따라다닙니다.

### 🐛 수정 사항

- **오디오가 전혀 없음** — 일부 설정에서 오류 메시지 없이 완전한 무음이 발생했습니다. 수정됨.
- **잘못된 음성 재생** — 일부 구성에서 AgentVibes가 AI별 음성 설정을 무시하고 기본값으로 돌아갔습니다. 수정됨.
- **메시지 간 오디오 설정 누출** — 한 메시지에 설정된 음악이나 리버브가 다음 메시지로 실수로 이어지는 문제가 있었습니다. 수정됨.
- **충돌 후 메시지 손실** — AgentVibes가 메시지 처리 중 충돌하면 해당 메시지가 사라졌습니다. 이제 재시작 시 복구하여 재생합니다.

---

## 🎛️ v5.6.2 — Per-Message Audio Control for Remote Providers

> See [English release notes](../../RELEASE_NOTES.md) for full details.

---


## 🤖 v5.6.1 — Hermes Agent 통합 & Windows PS5.1 수정

**릴리스:** 2026-05-01

### 🎉 Hermes Agent 통합 (신규!)

AgentVibes가 이제 **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — 자체 호스팅, 자기 개선 AI 어시스턴트를 공식 지원합니다. 프로덕션 준비 완료된 Hermes 스킬 2개가 `docs/hermes/skills/`에 포함됩니다:

**`hermes-agentvibes-hook`** — AgentVibes를 통해 모든 Hermes 응답을 자동 음성 출력
- 모든 `agent:end` 이벤트에서 실행 (Telegram, Discord, CLI 등)
- 발화 전 Markdown, 코드 블록, 이모지 제거
- 단어 경계에서 트런케이트, 큐 과부하 방지를 위한 속도 제한
- `StrictHostKeyChecking=accept-new` + 영구 `known_hosts`로 MITM 안전 SSH
- 디버깅을 위한 전체 로그를 `tts-hook.log`에 기록

**`agentvibes-target`** — Hermes가 온디맨드로 임의 텍스트를 스피커에 전송하도록 교육
- SSH를 통한 Base64 JSON 페이로드 (Windows 수신기와 동일한 ForceCommand 아키텍처)
- Windows 및 Android 타겟 지원
- 상세 문제 해결 가이드 포함

**설치:** 스킬을 Hermes 홈 디렉토리에 복사하고 게이트웨이 재시작:
```bash
cp -r docs/hermes/skills/tts/hermes-agentvibes-hook ~/.hermes/skills/tts/
hermes gateway restart
```

### 🐛 Windows PS5.1 수정

- **play-tts.ps1 PS5.1 호환성** — v5.6.0 리베이스에서 발생한 3가지 회귀 수정:
  PS7 null 조건부 연산자(`?.`)를 PS5.1 호환 if/else로 대체, CP1252로 em 대시가
  손상되지 않도록 UTF-8 BOM 추가, 병합 시 손실된 piper 공급자 별칭과
  `AGENTVIBES_TEXT_FILE` 센티넬 복원
- **모달 & 단축키 수정** — 모달 이스케이프 키, 내비게이션 단축키, Q+Caps Lock,
  음성 미리보기 오류 처리 모두 수정
- **BMAD 탭** — 이제 모듈에 관계없이 모든 에이전트 표시

---

## 🎵 v5.5.0 — LLM별 오디오 라우팅 & Windows 설치 프로그램 복원력

**릴리스:** 2026-04-27

### 🆕 LLM별 오디오 라우팅
각 LLM(Claude Code, Copilot, Codex)이 이제 자체 보이스, 프리텍스트, 리버브 및 배경 음악 설정을 가질 수 있습니다.
MCP 서버는 `--llm <key>`를 `play-tts.sh`(Linux/macOS)와 `play-tts.ps1`(Windows) 모두에 전달하며,
스크립트는 `audio-effects.cfg`에서 `llm:<key>` 행을 조회합니다. `claude-code`, `copilot`, `codex`의
기본 행이 기본 제공되며, TUI의 **Setup → Default → Configure**를 통해 구성할 수 있습니다.

### 🐛 Windows 설치 프로그램 충돌 수정
이전 버전의 전역 AgentVibes가 설치된 Windows에서 **재설치** 시 발생하던 `spinner.info is not a function`
오류를 수정했습니다. 설치 프로그램의 10개 파일 복사 함수 모두 이제 `createRobustSpinner()`로 스피너를 래핑하여,
노출하는 메서드와 관계없이 오래된 호출자가 충돌을 일으킬 수 없게 됩니다.

### 🎶 Windows 배경 음악 패리티
Windows TTS 재생이 이제 저품질 WinMM `SoundPlayer` 리샘플러보다 `ffplay`(sinc 리샘플링, 아티팩트 없음)를
우선합니다. 새로운 `Invoke-AudioPlay` 헬퍼가 폴백을 투명하게 처리합니다 — `ffplay`를 사용할 수 없는 경우
이전과 같이 `SoundPlayer`가 사용됩니다.

### 🎉 파티 모드 크로스 플랫폼 진입점
BMAD 파티 모드 단계 파일과 Copilot 스킬이 이제 일관되게 `node bin/bmad-speak.js`를 참조합니다 —
Windows에서는 `bmad-speak.ps1`로, 다른 곳에서는 `bmad-speak.sh`로 위임하는 단일 크로스 플랫폼 진입점입니다.

### 🔧 기타 수정 사항
- `play-tts.sh`가 이제 환경 변수 `LLM_PROVIDER` 외에 명명된 `--llm <key>` 플래그도 허용합니다
- `mcp-server/server.py`가 우선순위 체인 `AGENTVIBES_LLM` → `CLAUDECODE=1` → `AGENTVIBES_MCP_FALLBACK`으로
  라우팅하고 해결된 키를 `-llm`/`--llm`으로 TTS 스크립트에 전달합니다
- `audio-effects.cfg`에 `llm:claude-code`, `llm:copilot`, `llm:codex` 행 추가
- `command-routing.test.js` 및 `ConfigService` 단위 테스트 추가
- npm pack 콘텐츠 가드가 이제 추적되지 않는 게시 가능 파일을 감지합니다

### 📊 기술 사항
- 231개 테스트 통과 (실패 0)

---

## 🎛️ v5.4.0 — TUI 설치 프로그램, 스피너 수정 및 의존성 정리

**릴리스:** 2026-04-22

### ✨ 새로운 기능
- **TUI 설치 프로그램**: 안내식 설치를 위한 대화형 터미널 UI — 아름다운 터미널 인터페이스에서 보이스를 탐색하고, 프로바이더를 구성하고, BMAD 파티 모드를 활성화
- **크로스플랫폼 스피너 수정**: 설치를 차단하던 WSL/Linux의 `spinner.info is not a function` 충돌 해결

### 🐛 버그 수정
- **순환 자기 의존성 제거**: `package.json`이 `agentvibes@^3.5.9`(자기 자신)에 의존하고 있어 npm이 수정된 바이너리를 오래된 버그 있는 버전으로 가리고 있었음 — 반복 설치 시 스피너 충돌의 숨겨진 원인
- **배경 음악 볼륨 폴백 복원**: 머지에서 손실된 `audio-processor.sh`의 `bg_volume="0.20"` 폴백 복원
- **`play-tts.sh`의 PROJECT_ROOT 감지 수정**: 워크업 로직이 2단계 더 올라가 TTS가 프로젝트 설정 대신 전역 `~/.agentvibes` 설정을 사용하는 문제 수정

### 🔧 기술 사항
- 706/738 테스트 통과

---

## 🎯 v5.3.0 — 원격 보이스를 완전히 제어하세요

**릴리스 날짜:** 2026년 4월

AgentVibes를 사용해 서버에서 휴대폰, 노트북 또는 다른 머신으로 음성 안내 방송을 보내고 계신다면, 이번 릴리스에서 주도권은 당신에게 넘어갑니다. 이제 모든 호출이 자체 보이스, 배경 음악, 인트로 문구, 리버브, 볼륨, 속도를 선택할 수 있습니다 — 커맨드라인에서 바로, 해당 메시지 하나에만 적용됩니다.

### ✨ 새로운 기능

#### 모든 안내 방송을 개별적으로 커스터마이즈할 수 있습니다

이전에는 특정 메시지 하나에 다른 보이스나 음악을 사용하려면 구성 파일을 변경해야 했습니다(그리고 다시 되돌리는 것도 잊지 말아야 했죠). 이제 명령어에 플래그만 추가하면 됩니다.

이 배포 알림 하나에만 Winston이 영국 억양으로 말하고 재즈가 흐르게 하고 싶으신가요? 간단합니다:

```bash
bash .claude/hooks/play-tts-ssh-remote.sh \
  --text "Deploy complete" \
  --voice "en_US-ryan-high" \
  --pretext "Winston here" \
  --music "Late Night Hip Hop Groove.mp3" \
  --volume 0.25
```

지정하지 않은 항목은 모두 일반 설정으로 폴백됩니다. 이번 한 번만 인트로 문구를 건너뛰고 싶으신가요? `--pretext ""`를 전달하면 메시지 앞이 무음으로 유지됩니다.

**사용 가능한 플래그:**
- `--voice` — 사용할 Piper 보이스
- `--pretext` — 메시지 앞의 인트로 문구 (건너뛰려면 `""` 전달)
- `--music` — 배경 음악 트랙 (이제 공백이 있는 파일명도 작동합니다!)
- `--volume` — 배경 음악의 볼륨 (0.0 ~ 1.0)
- `--effects` — 리버브 같은 사운드 이펙트 체인
- `--speed` — 보이스의 말하는 속도
- `--provider` — 사용할 TTS 엔진
- `--agent` — 사용할 에이전트 성격

기존 방식의 스크립트 호출도 계속 작동하므로, 이미 설정해둔 것이 깨질 일은 없습니다.

### 🛠 안정성 수정

- **긴 메시지와 특수 문자가 더 이상 잘리지 않습니다.** Windows에서는 긴 안내 방송이나 따옴표, 아포스트로피, 이모지가 포함된 텍스트가 보이스 엔진에 도달하기 전에 망가지곤 했습니다. 수정되었습니다 — 이제 메시지의 길이나 특이함에 상관없이 보낸 그대로 정확하게 전달됩니다.

- **모니터가 없는 Windows 서버에서도 음성 안내 방송이 작동합니다.** Windows는 SSH가 일반적으로 사용하는 "서비스" 세션에서 오디오 재생을 거부합니다. 이제 작은 백그라운드 헬퍼가 일반 사용자 세션에서 실행되어 큐로부터 안내 방송을 가져오므로, 헤드리스 서버에서도 오디오가 올바르게 재생됩니다.

- **TUI의 음성 미리 듣기가 원격 서버에서 작동합니다.** 이전에는 스피커가 없는 서버에서 보이스를 미리 듣기하면 로컬에서 재생을 시도하다가 실패했습니다. 이제 구성한 원격 장치로 올바르게 스트리밍됩니다.

- **이중 인트로 문구가 사라졌습니다.** 송신 서버와 수신 머신 양쪽에 프리텍스트를 설정하면 이전에는 두 번 들렸습니다. 이제 송신자 쪽이 우선이며 — 수신자가 그 위에 자체 프리텍스트를 추가하지 않습니다.

- **원격 스트리밍 설정이 이제 실제로 유지됩니다.** 최근 변경으로 인해 원격 스트리밍 구성(`ssh-remote`, `agentvibes-receiver`)이 실수로 덮어써져 로컬 재생으로 폴백되던 문제가 있었습니다. 수정되었습니다.

- **긴 안내 방송이 문장 중간에 끊기지 않습니다.** 멈춘 오디오를 중지시키는 안전 타임아웃이 긴 메시지에는 너무 공격적이었습니다. 이제 단락 길이의 안내 방송도 처리할 수 있을 만큼 여유롭게 설정되었습니다.

- **더 깔끔한 인스톨러 상태** — Claude Code용 AgentVibes 설치 시, 이제 암묵적 상태에 의존하지 않고 TTS 프로바이더 파일을 명시적으로 작성합니다.

### 🧪 테스트

BMAD 파티 모드가 계속 작동하도록 보장하는 새 테스트 55개: 각 에이전트가 고유한 보이스와 음악을 받고, 에이전트들이 실수로 동일한 Piper 스피커 ID를 공유하지 않으며, 인스톨러가 항상 파티 모드를 크로스 플랫폼 진입점으로 가리키도록 합니다.

---

## 🎯 v5.2.1 — 멀티-LLM 아이덴티티 및 설치 마감

**릴리스 날짜:** 2026년 4월

Copilot/Codex를 위한 LLM 라우팅을 다듬고 셋업 경험을 개선했습니다.

### ✨ 새로운 기능

#### 멀티-LLM 아이덴티티 라우팅

- **GitHub Copilot이 이제 자체 보이스, 프리텍스트, 배경 음악을 가집니다** — Claude Code 및 Codex와 완전히 구별됩니다. 보사노바와 함께 "Copilot here"로 인사하세요.

- **명시적 아이덴티티를 가진 툴별 MCP 구성** — 각 AI 툴 (`.vscode/mcp.json`, `.codex/config.toml`, `~/.copilot/mcp-config.json`)이 자체 `AGENTVIBES_LLM`을 설정하여 라우팅이 결정적입니다.

- **MCP 도구 `get_config`가 이제 감지된 LLM을 반환** — 호출하는 어시스턴트가 라우팅을 확인하고 처음부터 올바른 보이스로 응답할 수 있습니다.

- **Linux 호환성 개선** — CRLF 줄 끝, 권한 및 전송 프로바이더 오버라이드 처리.

#### 셋업 플로우 개선

- **키보드 네비게이션 플로우** — 설치 버튼 (Claude → Copilot → Codex)에서 Enter를 누르면 이제 **Claude 구성**으로 점프하여, 기본값에 도달하기 전에 세 개의 구성을 모두 거칩니다.

- **아래 화살표가 기본값 행을 건너뜀** — 설치/제거 열에서.

- **부분 설치 성공 메시지** — 파일 복사는 성공하지만 MCP 구성에 약간의 조정이 필요한 경우, 일반적인 실패 대신 명확한 경고가 표시됩니다.

#### 기본값

- **Claude Code 기본 배경 음악**이 Chillwave (`agent_vibes_chillwave_v2_loop.mp3`)로 설정됩니다.

#### 내부적으로

- 안전한 환경 변수 처리를 위해 LLM 키 검증을 강화했습니다.
- Copilot CLI 구성 쓰기의 엣지 케이스에 대한 오류 로깅을 개선했습니다.
- 알려진 제한 사항 문서화: Claude Code에서 시작한 터미널에서 VS Code를 실행하면 `CLAUDECODE=1`이 누출될 수 있습니다 — 해결 방법은 먼저 `unset CLAUDECODE`를 실행하는 것입니다.

---

## 🎯 v5.2.0 — 원격 음성 미리 듣기 + 케이브맨 모드 + 음성 평가

**릴리스 날짜:** 2026년 4월

이번 릴리스에서는 원격 TTS 미리 듣기 지원, 새로운 초간결 상세도 모드, TUI 전반의 좋아요/싫어요 음성 평가 기능이 추가되었습니다.

### 새로운 기능

- **케이브맨 상세도 모드** — 초간결 TTS 출력을 위한 새로운 `caveman` 상세도 레벨. 문장 대신 단편으로 출력됩니다. `/agent-vibes:verbosity caveman` 또는 MCP `set_verbosity` 도구로 설정할 수 있습니다. 신규 설치 시 음성이 없으면 자동으로 다운로드합니다.

- **좋아요/싫어요 음성 평가** — 기존 스타 즐겨찾기를 👍/👎 평가로 대체합니다. Voices 탭과 음성 선택기(Setup 탭) 모두에서 `+`로 좋아요, `-`로 싫어요를 누를 수 있습니다. 평가는 세션 간에 유지되며 모든 음성 선택 UI에서 공유됩니다.

- **원격 음성 미리 듣기** — TUI Voices 탭, 음성 선택기, 음성 브라우저의 음성 미리 듣기가 이제 헤드리스 서버에서도 작동합니다. 활성 프로바이더가 `ssh-remote` 또는 `agentvibes-receiver`인 경우, 미리 듣기는 `play-tts.sh`를 통해 원격 리시버에서 오디오를 재생하며 로컬 Piper + 오디오 플레이어가 필요하지 않습니다. 플랫폼 인식: Windows에서는 PowerShell, Linux에서는 bash를 사용합니다.

- **SSH 리시버 프로바이더 라우팅** — `ssh-remote`와 `agentvibes-receiver`가 이제 `play-tts.sh`의 일급 프로바이더입니다. `speak_text()` 함수와 메인 라우팅 case 문 모두에서 지원되어 "Unknown provider" 오류가 해소되었습니다.

### 수정 사항

- **LibriTTS 스피커 이름 자동 패치** — 음성 다운로드 시 LibriTTS 스피커 이름을 자동으로 패치하여 멀티스피커 음성이 설치 즉시 올바르게 작동합니다.
- **음성 유효성 검사 정규식 강화** — `play-tts-ssh-remote.sh` 및 `play-tts-agentvibes-receiver.sh`의 VOICE 파라미터 정규식이 백슬래시(인젝션 위험)는 허용하지 않으면서 `::`(멀티스피커), `.`(로케일), 공백(스피커 이름)을 허용합니다. Linux 및 Windows 리시버 템플릿도 맞춰 업데이트되었습니다.
- **`base64` 크로스 플랫폼 호환성** — `play-tts-agentvibes-receiver.sh`가 이제 GNU `base64 -w 0`을 시도하고, BSD `-b 0`으로 폴백한 후 `tr -d '\n'`으로 폴백합니다. macOS/BSD 시스템에서의 스크립트 중단을 수정합니다.
- **오디오 이펙트 이중 처리 수정** — `AGENTVIBES_NO_PLAY`가 설정되어 있을 때 `play-tts-piper.ps1`이 자체 오디오 프로세서 호출을 건너뛰어 리버브/뮤직이 두 번 적용되는 것을 방지합니다.
- **종료 코드 누출 수정** — `play-tts.ps1`이 이제 코드 0으로 명시적으로 종료되어, 네이티브 명령의 종료 코드(piper, ffmpeg, sox)가 누출되어 잘못된 TTS 실패 보고를 일으키는 것을 방지합니다.
- **Windows 리시버 탭 플랫폼 지원** — Tailscale IP 감지, PowerShell을 통한 로컬 IP, sshd_config 읽기, 클립보드 복사가 이제 Windows에서 네이티브로 작동합니다.
- **`llm:default` 오디오 이펙트 행** — `audio-effects.cfg`의 새 기본 행으로 LLM별 설정 항목이 없어도 원격 리시버가 리버브, 뮤직, 프리텍스트를 받을 수 있습니다.
- **미리 듣기 샘플 텍스트** — "preview"라는 단어에 대한 Piper 발음 문제를 피하기 위해 변경되었습니다.
