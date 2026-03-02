#!/usr/bin/env bash
#
# File: .claude/hooks/path-resolver.sh
#
# AgentVibes Path Resolver Utility - Robust path resolution for all hooks
# Handles: symlinks, working directory changes, non-standard installations
#
# Usage in other scripts:
#   source "$(dirname "${BASH_SOURCE[0]}")/path-resolver.sh"
#   # Now use: $PROJECT_ROOT, $HOOKS_DIR, $SCRIPT_DIR
#

set -euo pipefail

# Resolve the actual script location (handles symlinks)
# This function must be called from the sourcing script
_resolve_agentvibes_paths() {
  local calling_script="$1"

  # Get real path (resolve symlinks)
  local script_path
  if command -v readlink &>/dev/null; then
    script_path="$(readlink -f "$calling_script")"
  else
    # Fallback for systems without readlink -f
    script_path="$(cd "$(dirname "$calling_script")" && pwd)/$(basename "$calling_script")"
  fi

  local script_dir="$(dirname "$script_path")"

  # Find PROJECT_ROOT by searching up for .claude/hooks directory
  # This is resilient to non-standard installations
  local current_dir="$script_dir"
  local project_root=""

  while [[ "$current_dir" != "/" ]]; do
    if [[ -d "$current_dir/.claude/hooks" ]]; then
      # Found .claude/hooks - PROJECT_ROOT is 2 levels up
      project_root="$(dirname "$(dirname "$current_dir")")"
      break
    fi
    current_dir="$(dirname "$current_dir")"
  done

  # Validate we found a valid project root
  if [[ -z "$project_root" ]] || [[ ! -d "$project_root/.claude/hooks" ]]; then
    echo "❌ ERROR: Could not locate AgentVibes installation" >&2
    echo "   Script: $script_path" >&2
    return 1
  fi

  # Export paths for use in sourcing script
  export SCRIPT_PATH="$script_path"
  export SCRIPT_DIR="$script_dir"
  export HOOKS_DIR="$project_root/.claude/hooks"
  export PROJECT_ROOT="$project_root"
}

# Call the resolver with the calling script
_resolve_agentvibes_paths "${BASH_SOURCE[1]}"
