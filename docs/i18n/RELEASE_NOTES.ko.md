> 🌐 [English version](../../RELEASE_NOTES.md)

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
