#!/usr/bin/env bash
# AgentVibes server diagnostics — run this ON the server (e.g. ubuntu-rdp) to
# reproduce and verify the two reported install bugs:
#   #205  Kokoro pip install fails on externally-managed Python (PEP 668)
#   #206  Piper installs only lessac instead of the full voice set
#
# It is READ-MOSTLY: it inspects the environment and counts installed voices.
# Only the optional `--install-kokoro` step writes anything (a pip install),
# and only when you pass that flag.
#
# Usage:
#   bash diagnose-server.sh                 # inspect + report (no installs)
#   bash diagnose-server.sh --install-kokoro  # also test the Kokoro pip fix
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*"; }
hdr()  { echo -e "\n${CYAN}== $* ==${NC}"; }

INSTALL_KOKORO=false
[[ "${1:-}" == "--install-kokoro" ]] && INSTALL_KOKORO=true

# ---------------------------------------------------------------------------
hdr "Python & pip"
PY=""
for c in python3 python; do command -v "$c" >/dev/null 2>&1 && { PY="$c"; break; }; done
if [[ -z "$PY" ]]; then err "No python3/python on PATH — Kokoro cannot work."; else
  ok "python: $PY ($("$PY" --version 2>&1))"
fi

if [[ -n "$PY" ]]; then
  # PEP 668: is this interpreter "externally managed"? (the #205 trigger)
  EM=$("$PY" -c "import sysconfig,os;print('yes' if os.path.exists(os.path.join(sysconfig.get_path('stdlib'),'EXTERNALLY-MANAGED')) else 'no')" 2>/dev/null || echo "unknown")
  if [[ "$EM" == "yes" ]]; then
    warn "Python is EXTERNALLY-MANAGED (PEP 668) — a bare 'pip install' WILL fail."
    echo -e "    ${CYAN}The 5.11.2 picker fix auto-adds --break-system-packages here.${NC}"
  elif [[ "$EM" == "no" ]]; then
    ok "Python is not externally-managed — plain pip install works."
  else
    warn "Could not determine externally-managed status."
  fi

  # Are the Kokoro deps importable right now?
  if "$PY" -c "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('kokoro') and importlib.util.find_spec('soundfile') else 1)" 2>/dev/null; then
    ok "kokoro + soundfile import OK (voices should show ✓/☁, not yellow !)"
  else
    warn "kokoro/soundfile NOT importable — picker will show yellow ! until installed."
  fi
fi

# ---------------------------------------------------------------------------
hdr "Piper voices (#206)"
VOICES_DIR=""
for d in "$HOME/.claude/piper-voices" "$HOME/.local/share/agentvibes/piper-voices"; do
  [[ -d "$d" ]] && { VOICES_DIR="$d"; break; }
done
# Honor an explicit dir file if present
[[ -f "$HOME/.claude/piper-voices-dir.txt" ]] && VOICES_DIR="$(cat "$HOME/.claude/piper-voices-dir.txt")"

if [[ -z "$VOICES_DIR" || ! -d "$VOICES_DIR" ]]; then
  warn "No Piper voices dir found (looked in ~/.claude/piper-voices)."
else
  N=$(find "$VOICES_DIR" -maxdepth 1 -name '*.onnx' 2>/dev/null | grep -vc '\.json$' || echo 0)
  echo "    voices dir: $VOICES_DIR"
  if [[ "$N" -le 1 ]]; then
    err "Only $N Piper voice model(s) installed — this is the #206 symptom."
    echo -e "    ${CYAN}Get the ~15 common set:${NC} ~/.claude/hooks/piper-download-voices.sh --yes"
    echo -e "    ${CYAN}Get the 900 LibriTTS pack:${NC} ~/.claude/hooks/piper-download-voices.sh --libritts --yes"
  else
    ok "$N Piper voice models installed."
  fi
  if [[ -f "$VOICES_DIR/en_US-libritts-high.onnx" ]]; then
    ok "LibriTTS 900-speaker pack present."
  else
    warn "LibriTTS 900-speaker pack NOT present (that's the source of the 900 voices)."
  fi
fi

# ---------------------------------------------------------------------------
if $INSTALL_KOKORO && [[ -n "$PY" ]]; then
  hdr "Testing the Kokoro pip fix (--install-kokoro)"
  EXTRA=()
  [[ "${EM:-}" == "yes" ]] && EXTRA=(--break-system-packages)
  echo -e "    running: ${CYAN}$PY -m pip install ${EXTRA[*]:-} kokoro soundfile numpy${NC}"
  if "$PY" -m pip install "${EXTRA[@]}" kokoro soundfile numpy; then
    if "$PY" -c "import kokoro, soundfile" 2>/dev/null; then
      ok "Kokoro deps installed AND importable — #205 fix path works on this server."
    else
      err "Install reported success but import still fails — please share the output."
    fi
  else
    err "pip install failed — please copy the error above into the GitHub issue."
  fi
fi

hdr "Done"
echo "Share this output on issues #205 (Kokoro) / #206 (Piper) if anything is red."
