#!/bin/bash
#
# @fileoverview GitHub Star Reminder System
# @context Shows a gentle reminder once per day to star the repo
# @architecture Tracks last reminder date in a timestamp file
# @why Encourage users to support the project without being annoying
#

# Determine config directory (project-local or global)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"

# Check if we have a project-local .claude directory
if [[ -d "$CLAUDE_DIR" ]] && [[ "$CLAUDE_DIR" != "$HOME/.claude" ]]; then
  REMINDER_FILE="$CLAUDE_DIR/github-star-reminder.txt"
else
  REMINDER_FILE="$HOME/.claude/github-star-reminder.txt"
  mkdir -p "$HOME/.claude"
fi

GITHUB_REPO="https://github.com/paulpreibisch/AgentVibes"

# Check if reminders are disabled
is_reminder_disabled() {
  # Check for disable flag file
  local disable_file_local="$CLAUDE_DIR/github-star-reminder-disabled.flag"
  local disable_file_global="$HOME/.claude/github-star-reminder-disabled.flag"

  if [[ -f "$disable_file_local" ]] || [[ -f "$disable_file_global" ]]; then
    return 0  # Disabled
  fi

  # Check if reminder file contains "disabled"
  if [[ -f "$REMINDER_FILE" ]]; then
    local content=$(cat "$REMINDER_FILE" 2>/dev/null)
    if [[ "$content" == "disabled" ]]; then
      return 0  # Disabled
    fi
  fi

  return 1  # Not disabled
}

# Check if we should show the reminder
should_show_reminder() {
  # Check if disabled first
  if is_reminder_disabled; then
    return 1
  fi

  # If no reminder file exists, show it
  if [[ ! -f "$REMINDER_FILE" ]]; then
    return 0
  fi

  # Read last reminder date
  LAST_REMINDER=$(cat "$REMINDER_FILE" 2>/dev/null || echo "0")
  CURRENT_DATE=$(date +%Y%m%d)

  # Show reminder if it's a new day
  if [[ "$LAST_REMINDER" != "$CURRENT_DATE" ]]; then
    return 0
  fi

  return 1
}

# Show the reminder
show_reminder() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⭐ Enjoying AgentVibes?"
  echo ""
  echo "   If you find this project helpful, please consider giving us"
  echo "   a star on GitHub! It helps others discover AgentVibes and"
  echo "   motivates us to keep improving it."
  echo ""
  echo "   👉 $GITHUB_REPO"
  echo ""
  echo "   Thank you for your support! 🙏"
  echo ""
  echo "   💡 To disable these reminders, run:"
  echo "   echo \"disabled\" > $REMINDER_FILE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Update the reminder file with today's date
  date +%Y%m%d > "$REMINDER_FILE"
}

# Main execution
if should_show_reminder; then
  show_reminder
fi
