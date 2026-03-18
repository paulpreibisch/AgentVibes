#!/usr/bin/env bash
# Shared assertion helpers for BMAD voice map tests
# Used by: bmad-voice-map.bats, bmad-voice-map-edge-cases.bats

# Assert output contains expected string
# Usage: assert_output_contains "expected substring"
assert_output_contains() {
  local expected="$1"
  if [[ "$output" != *"$expected"* ]]; then
    echo "Expected output to contain: $expected"
    echo "Actual output: $output"
    return 1
  fi
}

# Assert output equals expected after cleaning warnings/whitespace
# Usage: assert_output_equals_clean "expected_value"
assert_output_equals_clean() {
  local expected="$1"
  local clean_output=$(echo "$output" | grep -v "warning:" | tr -d '[:space:]')
  if [[ "$clean_output" != "$expected" ]]; then
    echo "Expected (clean): $expected"
    echo "Actual (clean): $clean_output"
    echo "Actual (raw): $output"
    return 1
  fi
}

# Assert output is empty after removing warnings
# Usage: assert_output_empty_clean
assert_output_empty_clean() {
  local clean_output=$(echo "$output" | grep -v "warning:")
  if [[ -n "$clean_output" ]]; then
    echo "Expected empty output after removing warnings"
    echo "Actual output: $clean_output"
    return 1
  fi
}
