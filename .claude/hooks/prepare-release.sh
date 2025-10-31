#!/usr/bin/env bash
#
# File: .claude/hooks/prepare-release.sh
#
# AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# DISCLAIMER: This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND,
# express or implied, including but not limited to the warranties of
# merchantability, fitness for a particular purpose and noninfringement.
# In no event shall the authors or copyright holders be liable for any claim,
# damages or other liability, whether in an action of contract, tort or
# otherwise, arising from, out of or in connection with the software or the
# use or other dealings in the software.
#
# ---
#
# @fileoverview Release preparation helper script with AI-generated notes
# @context Placeholder script intended to be replaced by Claude AI for generating release notes
# @architecture Simple informational script - actual logic delegated to Claude AI
# @dependencies None (informational only)
# @entrypoints Called manually or via CLI for release preparation
# @patterns Fail-fast messaging, user guidance
# @related RELEASE_NOTES.md, package.json version bumping

BUMP_TYPE="${1:-patch}"

echo "🤖 Preparing release with AI-generated summary..."
echo ""
echo "This command tells Claude AI to:"
echo "1. Analyze changes since last release"
echo "2. Generate intelligent summary"
echo "3. Create RELEASE_NOTES.md"
echo "4. Bump version to $BUMP_TYPE"
echo "5. Commit everything"
echo ""
echo "⚠️  This is handled by Claude AI, not this script"
echo "Please ask Claude to prepare the release instead"
