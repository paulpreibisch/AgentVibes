#!/usr/bin/env bats
# Tests for bmad-voices.md parsing fallback and markdown stripping
# Covers GH issues #166 (pretexts not spoken) and #167 (asterisks spoken)

load ../helpers/test-helper

setup() {
  setup_test_env
  setup_agentvibes_scripts
  mock_curl
  mock_audio_players

  # Create bmad-voices.md fixture
  VOICES_MD_DIR="$CLAUDE_PROJECT_DIR/.agentvibes/bmad"
  mkdir -p "$VOICES_MD_DIR"
  cat > "$VOICES_MD_DIR/bmad-voices.md" << 'MDEOF'
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
| ux-designer | Sally (UX Designer) | Sally, UX Designer here | Jessica Anne Bogart | en_US-lessac-high | normal |
MDEOF

  # Create agent manifest for ID resolution
  MANIFEST_DIR="$CLAUDE_PROJECT_DIR/_bmad/_config"
  mkdir -p "$MANIFEST_DIR"
  cat > "$MANIFEST_DIR/agent-manifest.csv" << 'CSVEOF'
name,displayName,title
"bmad-agent-pm","John","Product Manager"
"bmad-agent-dev","Amelia","Developer"
"bmad-agent-analyst","Mary","Business Analyst"
"bmad-agent-architect","Winston","Architect"
"bmad-agent-ux-designer","Sally","UX Designer"
CSVEOF

  # Create a test script that parses bmad-voices.md (bash equivalent of PS1 logic)
  cat > "$BATS_TEST_TMPDIR/parse-voices-md.sh" << 'SHEOF'
#!/bin/bash
# Test script: parses bmad-voices.md and outputs pretext for a given agent ID
AGENT_ID="$1"
VOICES_MD="$2"

if [[ ! -f "$VOICES_MD" ]]; then
  echo "NOT_FOUND"
  exit 1
fi

# Strip bmad-agent- prefix
SHORT_ID="${AGENT_ID#bmad-agent-}"

while IFS= read -r line; do
  # Skip non-table rows
  [[ "$line" != \|* ]] && continue
  [[ "$line" == \|--* ]] && continue
  [[ "$line" == *"Agent ID"* ]] && continue

  # Split by pipe
  IFS='|' read -ra cols <<< "$line"
  # cols[0]=empty, [1]=Agent ID, [2]=Agent Name, [3]=Intro, [4]=PiperTTS, [5]=Piper, [6]=Personality
  table_id=$(echo "${cols[1]}" | xargs)

  if [[ "$table_id" == "$SHORT_ID" ]] || [[ "$table_id" == "$AGENT_ID" ]]; then
    pretext=$(echo "${cols[3]}" | xargs)
    voice=$(echo "${cols[5]}" | xargs)
    personality=$(echo "${cols[6]}" | xargs)
    echo "PRETEXT=$pretext"
    echo "VOICE=$voice"
    echo "PERSONALITY=$personality"
    exit 0
  fi
done < "$VOICES_MD"

echo "NO_MATCH"
exit 1
SHEOF
  chmod +x "$BATS_TEST_TMPDIR/parse-voices-md.sh"

  # Create markdown stripping test script (bash equivalent of PS1 logic)
  # Written to a file with proper escaping for backticks
  local strip_script="$BATS_TEST_TMPDIR/strip-markdown.sh"
  printf '#!/bin/bash\n' > "$strip_script"
  printf 'TEXT="$1"\n' >> "$strip_script"
  printf 'TEXT=$(echo "$TEXT" | sed '"'"'s/\\*\\{1,3\\}//g'"'"')\n' >> "$strip_script"
  printf 'TEXT=$(echo "$TEXT" | sed "s/\\`\\{1,3\\}[^\\`]*\\`\\{1,3\\}//g")\n' >> "$strip_script"
  printf 'TEXT=$(echo "$TEXT" | sed '"'"'s/^#\\{1,6\\} *//g'"'"')\n' >> "$strip_script"
  printf 'TEXT=$(echo "$TEXT" | sed '"'"'s/_\\{1,2\\}//g'"'"')\n' >> "$strip_script"
  printf 'TEXT=$(echo "$TEXT" | sed '"'"'s/^\\s*[-*+] //g'"'"')\n' >> "$strip_script"
  printf 'TEXT=$(echo "$TEXT" | sed '"'"'s/^\\s*[0-9]\\+\\. //g'"'"')\n' >> "$strip_script"
  printf 'TEXT=$(echo "$TEXT" | xargs)\n' >> "$strip_script"
  printf 'echo "$TEXT"\n' >> "$strip_script"
  chmod +x "$strip_script"
}

teardown() {
  teardown_test_env
}

# ============================================================================
# Issue #166: Pretext resolution from bmad-voices.md
# ============================================================================

@test "voices.md: resolves pretext for pm agent" {
  run "$BATS_TEST_TMPDIR/parse-voices-md.sh" "pm" "$VOICES_MD_DIR/bmad-voices.md"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "PRETEXT=John, Product Manager here"
}

@test "voices.md: resolves pretext for analyst agent" {
  run "$BATS_TEST_TMPDIR/parse-voices-md.sh" "analyst" "$VOICES_MD_DIR/bmad-voices.md"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "PRETEXT=Mary, Business Analyst here"
}

@test "voices.md: resolves pretext with bmad-agent- prefix stripped" {
  run "$BATS_TEST_TMPDIR/parse-voices-md.sh" "bmad-agent-architect" "$VOICES_MD_DIR/bmad-voices.md"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "PRETEXT=Winston, Architect here"
}

@test "voices.md: resolves voice for dev agent" {
  run "$BATS_TEST_TMPDIR/parse-voices-md.sh" "dev" "$VOICES_MD_DIR/bmad-voices.md"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "VOICE=en_US-amy-medium"
}

@test "voices.md: resolves personality for pm agent" {
  run "$BATS_TEST_TMPDIR/parse-voices-md.sh" "pm" "$VOICES_MD_DIR/bmad-voices.md"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "PERSONALITY=professional"
}

@test "voices.md: handles hyphenated agent IDs (ux-designer)" {
  run "$BATS_TEST_TMPDIR/parse-voices-md.sh" "ux-designer" "$VOICES_MD_DIR/bmad-voices.md"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "PRETEXT=Sally, UX Designer here"
  echo "$output" | grep -q "VOICE=en_US-lessac-high"
}

@test "voices.md: returns NO_MATCH for unknown agent" {
  run "$BATS_TEST_TMPDIR/parse-voices-md.sh" "nonexistent" "$VOICES_MD_DIR/bmad-voices.md"
  [ "$status" -eq 1 ]
  echo "$output" | grep -q "NO_MATCH"
}

@test "voices.md: returns NOT_FOUND when file missing" {
  run "$BATS_TEST_TMPDIR/parse-voices-md.sh" "pm" "/nonexistent/path/bmad-voices.md"
  [ "$status" -eq 1 ]
  echo "$output" | grep -q "NOT_FOUND"
}

# ============================================================================
# Issue #167: Markdown stripping
# ============================================================================

@test "markdown: strips bold (double asterisks)" {
  run "$BATS_TEST_TMPDIR/strip-markdown.sh" "This is **bold** text"
  [ "$status" -eq 0 ]
  [[ "$output" != *"**"* ]]
  [[ "$output" == *"bold"* ]]
}

@test "markdown: strips italic (single asterisk)" {
  run "$BATS_TEST_TMPDIR/strip-markdown.sh" "This is *italic* text"
  [ "$status" -eq 0 ]
  [[ "$output" != *"*"* ]]
  [[ "$output" == *"italic"* ]]
}

@test "markdown: strips bold-italic (triple asterisks)" {
  run "$BATS_TEST_TMPDIR/strip-markdown.sh" "This is ***bold italic*** text"
  [ "$status" -eq 0 ]
  [[ "$output" != *"***"* ]]
  [[ "$output" == *"bold italic"* ]]
}

@test "markdown: strips inline code (backticks)" {
  run "$BATS_TEST_TMPDIR/strip-markdown.sh" 'Use the `grep` command'
  [ "$status" -eq 0 ]
  [[ "$output" != *'`'* ]]
}

@test "markdown: strips headings" {
  run "$BATS_TEST_TMPDIR/strip-markdown.sh" "## My Heading"
  [ "$status" -eq 0 ]
  [[ "$output" != *"##"* ]]
  [[ "$output" == *"My Heading"* ]]
}

@test "markdown: strips underscores (italic/bold alt)" {
  run "$BATS_TEST_TMPDIR/strip-markdown.sh" "This is __bold__ and _italic_"
  [ "$status" -eq 0 ]
  [[ "$output" != *"_"* ]]
  [[ "$output" == *"bold"* ]]
  [[ "$output" == *"italic"* ]]
}

@test "markdown: strips bullet markers" {
  run "$BATS_TEST_TMPDIR/strip-markdown.sh" "- First item"
  [ "$status" -eq 0 ]
  [[ "$output" != *"- "* ]]
  [[ "$output" == *"First item"* ]]
}

@test "markdown: strips numbered list markers" {
  run "$BATS_TEST_TMPDIR/strip-markdown.sh" "1. First item"
  [ "$status" -eq 0 ]
  [[ "$output" == *"First item"* ]]
}

@test "markdown: complex mixed markdown stripped cleanly" {
  run "$BATS_TEST_TMPDIR/strip-markdown.sh" "**Hello**, I recommend using *microservices* for the __architecture__"
  [ "$status" -eq 0 ]
  [[ "$output" != *"*"* ]]
  [[ "$output" != *"_"* ]]
  [[ "$output" == *"Hello"* ]]
  [[ "$output" == *"microservices"* ]]
  [[ "$output" == *"architecture"* ]]
}

@test "markdown: does not corrupt plain text" {
  run "$BATS_TEST_TMPDIR/strip-markdown.sh" "Just a normal sentence with no markdown"
  [ "$status" -eq 0 ]
  [[ "$output" == "Just a normal sentence with no markdown" ]]
}
