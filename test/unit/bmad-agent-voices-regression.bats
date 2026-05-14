#!/usr/bin/env bats
# Regression tests: each BMAD agent speaks with their uniquely assigned voice
#
# Why: Party mode and individual agent sessions must route audio to the correct
# voice per agent. If the voice manager returns the wrong voice (e.g., swapped
# hardcoded defaults, CSV column misalignment, or generic-value bypass), agents
# sound identical and lose their distinct character.
#
# Voice resolution order in bmad-voice-manager.sh:
#   1. CSV (.bmad/_cfg/agent-voice-map.csv) — if found AND non-generic value
#   2. Hardcoded case-statement defaults — for all 11 standard agents
#   3. Markdown fallback (.agentvibes/bmad/bmad-voices.md) — custom/extended agents only
#
# Coverage:
#   Suite 1: Hardcoded defaults (no CSV) — all 11 standard agents
#   Suite 2: CSV overrides — non-generic CSV voice replaces hardcoded default
#   Suite 3: CSV bypass — generic CSV value falls through to hardcoded default
#   Suite 4: Markdown fallback — custom agent (not in case statement)
#   Suite 5: Safety — no empty voice, swap regression guards

load ../helpers/test-helper
load ../helpers/bmad-assertions

setup() {
  setup_test_env
  setup_agentvibes_scripts

  VOICE_MANAGER="$TEST_CLAUDE_DIR/hooks/bmad-voice-manager.sh"
  BMAD_CFG_DIR="$CLAUDE_PROJECT_DIR/.bmad/_cfg"
  VOICES_MD_DIR="$CLAUDE_PROJECT_DIR/.agentvibes/bmad"

  mkdir -p "$BMAD_CFG_DIR"
  mkdir -p "$VOICES_MD_DIR"

  # Default: markdown config present (for Suite 4), no CSV
  cat > "$VOICES_MD_DIR/bmad-voices.md" << 'MD'
---
plugin: bmad-voices
version: 2.0.0
enabled: true
---

## Agent Voice Mappings (Provider-Aware)

| Agent ID | Agent Name | Intro | Piper TTS Voice | Piper Voice | Personality |
|----------|------------|-------|------------------|-------------|-------------|
| pm | John (Product Manager) | John, Product Manager here | Matthew Schmitz | en_US-john-medium | professional |
| dev | Amelia (Developer) | Amelia, Developer here | Aria | en_US-amy-medium | normal |
| analyst | Mary (Business Analyst) | Mary, Business Analyst here | Jessica Anne Bogart | en_US-kristin-medium | normal |
| architect | Winston (Architect) | Winston, Architect here | Michael | en_GB-alan-medium | normal |
| sm | Bob (Scrum Master) | Bob, Scrum Master here | Matthew Schmitz | en_US-joe-medium | professional |
| tea | Murat (Test Architect) | Murat, Test Architect here | Michael | en_US-kusal-medium | normal |
| tech-writer | Paige (Technical Writer) | Paige, Technical Writer here | Aria | en_US-lessac-medium | normal |
| ux-designer | Sally (UX Designer) | Sally, UX Designer here | Jessica Anne Bogart | en_US-lessac-high | normal |
| frame-expert | Saif (Visual Designer) | Saif, Visual Designer here | Matthew Schmitz | en_GB-alan-medium | normal |
| bmad-master | BMad Master | BMad Master here | Michael | en_US-libritts-high | zen |
| quick-flow-solo-dev | Barry (Quick Flow Solo Dev) | Barry, Quick Flow Solo Dev here | Matthew Schmitz | en_US-john-medium | professional |
| custom-agent | Dr. Kira (Custom) | Kira here | Aria | en_US-arctic-medium | normal |
MD

  # Write enabled flag so markdown fallback is accessible in Suite 4
  mkdir -p "$VOICES_MD_DIR"
  touch "$VOICES_MD_DIR/bmad-voices-enabled.flag"

  # piper as active provider
  mkdir -p "$CLAUDE_PROJECT_DIR/.claude"
  echo "piper" > "$CLAUDE_PROJECT_DIR/.claude/tts-provider.txt"
}

teardown() {
  teardown_test_env
}

# ══════════════════════════════════════════════════════════════════════════════
# Suite 1: Hardcoded defaults — no CSV present
# These are the canonical voices for each BMAD agent, regression-pinned.
# ══════════════════════════════════════════════════════════════════════════════

@test "defaults: pm (John) → en_US-ryan-high" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

@test "defaults: dev (Amelia) → en_US-joe-medium" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "dev"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-joe-medium"
}

@test "defaults: analyst (Mary) → en_US-kristin-medium" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "analyst"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-kristin-medium"
}

@test "defaults: architect (Winston) → en_GB-alan-medium" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "architect"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_GB-alan-medium"
}

@test "defaults: sm (Bob) → en_US-amy-medium" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "sm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-amy-medium"
}

@test "defaults: tea (Murat) → en_US-kusal-medium" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "tea"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-kusal-medium"
}

@test "defaults: tech-writer (Paige) → en_US-kristin-medium" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "tech-writer"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-kristin-medium"
}

@test "defaults: ux-designer (Sally) → en_US-kristin-medium" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "ux-designer"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-kristin-medium"
}

@test "defaults: frame-expert (Saif) → en_GB-alan-medium" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "frame-expert"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_GB-alan-medium"
}

@test "defaults: bmad-master → en_US-lessac-medium" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "bmad-master"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-lessac-medium"
}

@test "defaults: quick-flow-solo-dev (Barry) → en_US-joe-medium" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "quick-flow-solo-dev"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-joe-medium"
}

# ══════════════════════════════════════════════════════════════════════════════
# Suite 2: CSV overrides — non-generic CSV voice replaces hardcoded default
# ══════════════════════════════════════════════════════════════════════════════

@test "CSV override: pm gets custom voice from CSV" {
  mkdir -p "$BMAD_CFG_DIR"
  cat > "$BMAD_CFG_DIR/agent-voice-map.csv" << 'CSV'
agent,voice,intro
pm,en_US-danny-low,"John here"
dev,en_US-ryan-high,"Amelia here"
CSV

  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-danny-low"
}

@test "CSV override: dev gets custom voice from CSV" {
  mkdir -p "$BMAD_CFG_DIR"
  cat > "$BMAD_CFG_DIR/agent-voice-map.csv" << 'CSV'
agent,voice,intro
pm,en_US-danny-low,"John here"
dev,en_US-ryan-high,"Amelia here"
CSV

  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "dev"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-ryan-high"
}

@test "CSV override: agent absent from CSV falls back to hardcoded default" {
  mkdir -p "$BMAD_CFG_DIR"
  # CSV only has pm — analyst not listed
  cat > "$BMAD_CFG_DIR/agent-voice-map.csv" << 'CSV'
agent,voice,intro
pm,en_US-danny-low,"John here"
CSV

  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "analyst"
  [ "$status" -eq 0 ]
  # analyst not in CSV → hardcoded default
  assert_output_equals_clean "en_US-kristin-medium"
}

# ══════════════════════════════════════════════════════════════════════════════
# Suite 3: CSV bypass — generic en_US-lessac-medium value ignored
# The voice manager treats this as "not set" and uses hardcoded default instead.
# ══════════════════════════════════════════════════════════════════════════════

@test "CSV bypass: generic en_US-lessac-medium in CSV is ignored, uses hardcoded default" {
  mkdir -p "$BMAD_CFG_DIR"
  cat > "$BMAD_CFG_DIR/agent-voice-map.csv" << 'CSV'
agent,voice,intro
pm,en_US-lessac-medium,"John here"
CSV

  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "pm"
  [ "$status" -eq 0 ]
  # Generic value bypassed — pm hardcoded default is en_US-ryan-high
  assert_output_equals_clean "en_US-ryan-high"
}

# ══════════════════════════════════════════════════════════════════════════════
# Suite 4: Markdown fallback — custom agent not in hardcoded case statement
# Only agents absent from the case statement reach the markdown path.
# ══════════════════════════════════════════════════════════════════════════════

@test "markdown: custom agent not in case statement resolves via bmad-voices.md" {
  # No CSV — custom-agent is not in the hardcoded case statement
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "custom-agent"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-arctic-medium"
}

@test "markdown: custom agent CSV value takes priority over markdown" {
  mkdir -p "$BMAD_CFG_DIR"
  cat > "$BMAD_CFG_DIR/agent-voice-map.csv" << 'CSV'
agent,voice,intro
custom-agent,en_US-bryce-medium,"Kira here"
CSV

  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "custom-agent"
  [ "$status" -eq 0 ]
  assert_output_equals_clean "en_US-bryce-medium"
}

# ══════════════════════════════════════════════════════════════════════════════
# Suite 5: Safety — no empty voice, swap regression guards
# ══════════════════════════════════════════════════════════════════════════════

@test "safety: no standard agent returns empty voice" {
  cd "$CLAUDE_PROJECT_DIR"
  local agents=( pm dev analyst architect sm tea tech-writer ux-designer frame-expert bmad-master quick-flow-solo-dev )
  for agent in "${agents[@]}"; do
    run "$VOICE_MANAGER" get-voice "$agent"
    [ "$status" -eq 0 ]
    local clean=$(echo "$output" | grep -v "warning:" | tr -d '[:space:]')
    [ -n "$clean" ] || {
      echo "REGRESSION: agent '$agent' returned empty voice"
      return 1
    }
  done
}

@test "safety: swap regression — dev does not get pm voice" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "dev"
  [ "$status" -eq 0 ]
  local dev_voice=$(echo "$output" | grep -v "warning:" | tr -d '[:space:]')
  [ "$dev_voice" != "en_US-ryan-high" ] || {
    echo "REGRESSION: dev (Amelia) returned pm (John) voice en_US-ryan-high"
    return 1
  }
}

@test "safety: swap regression — sm does not get dev voice" {
  cd "$CLAUDE_PROJECT_DIR"
  run "$VOICE_MANAGER" get-voice "sm"
  [ "$status" -eq 0 ]
  local sm_voice=$(echo "$output" | grep -v "warning:" | tr -d '[:space:]')
  [ "$sm_voice" != "en_US-joe-medium" ] || {
    echo "REGRESSION: sm (Bob) returned dev (Amelia) voice en_US-joe-medium"
    return 1
  }
}

@test "safety: voice format is valid piper voice ID (en_XX-model-quality)" {
  cd "$CLAUDE_PROJECT_DIR"
  local agents=( pm dev analyst architect sm tea tech-writer ux-designer frame-expert bmad-master )
  for agent in "${agents[@]}"; do
    run "$VOICE_MANAGER" get-voice "$agent"
    [ "$status" -eq 0 ]
    local clean=$(echo "$output" | grep -v "warning:" | tr -d '[:space:]')
    # All piper voice IDs match en_XX-model-quality or en_XX-model_variant-quality
    [[ "$clean" =~ ^en_[A-Z]{2}-[a-zA-Z0-9_]+-[a-z]+$ ]] || \
    [[ "$clean" =~ ^en_[A-Z]{2}-[a-zA-Z0-9_]+::[A-Za-z0-9_-]+$ ]] || {
      echo "REGRESSION: agent '$agent' has malformed voice ID: '$clean'"
      return 1
    }
  done
}
