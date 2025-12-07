#!/usr/bin/env bats
# Test personality voice mappings to prevent regression

load '../helpers/test-helper'

setup() {
  # Set REPO_ROOT for tests
  export REPO_ROOT="${BATS_TEST_DIRNAME}/../.."
}

# Expected personality -> voice mappings
# These should remain stable to prevent voice mix-ups
declare -A EXPECTED_VOICES=(
  ["crass"]="Ralf Eisend"
  ["sarcastic"]="Jessica Anne Bogart"
  ["flirty"]="Jessica Anne Bogart"
  ["annoying"]="Lutz Laugh"
  ["angry"]="Demon Monster"
  ["pirate"]="Pirate Marshal"
  ["robot"]="Dr. Von Fusion"
  ["zen"]="Aria"
  ["dramatic"]="Northern Terry"
  ["millennial"]="Amy"
  ["surfer-dude"]="Cowboy Bob"
  ["sassy"]="Ms. Walker"
  ["normal"]="Aria"
  ["professional"]="Matthew Schmitz"
  ["moody"]="Michael"
  ["funny"]="Lutz Laugh"
  ["poetic"]="Aria"
  ["grandpa"]="Grandpa Spuds Oxley"
)

@test "personality files have correct voice assignments" {
  local failed=0
  local errors=""

  for personality in "${!EXPECTED_VOICES[@]}"; do
    expected_voice="${EXPECTED_VOICES[$personality]}"
    personality_file="$REPO_ROOT/.claude/personalities/${personality}.md"

    # Check if personality file exists
    if [[ ! -f "$personality_file" ]]; then
      errors="${errors}Missing personality file: ${personality}.md\n"
      failed=1
      continue
    fi

    # Extract voice from personality file
    actual_voice=$(grep "^voice:" "$personality_file" | cut -d: -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Compare
    if [[ "$actual_voice" != "$expected_voice" ]]; then
      errors="${errors}Personality '${personality}' has wrong voice:\n"
      errors="${errors}  Expected: ${expected_voice}\n"
      errors="${errors}  Actual: ${actual_voice}\n\n"
      failed=1
    fi
  done

  if [[ $failed -eq 1 ]]; then
    echo -e "$errors"
    return 1
  fi
}

@test "all personality files have piper_voice field" {
  local failed=0
  local errors=""

  for personality_file in "$REPO_ROOT/.claude/personalities"/*.md; do
    personality_name=$(basename "$personality_file" .md)

    # Check if file has piper_voice field (ElevenLabs removed in v2.15.0)
    if ! grep -q "^piper_voice:" "$personality_file"; then
      errors="${errors}Personality '${personality_name}' missing piper_voice field\n"
      failed=1
    fi
  done

  if [[ $failed -eq 1 ]]; then
    echo -e "$errors"
    return 1
  fi
}
