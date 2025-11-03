# AgentVibes Release Notes

## v2.2.1 - Documentation & Installer UX Improvements (2025-11-03)

### 🤖 AI Summary

This patch release improves the user experience during installation and updates the documentation to reflect the latest v2.2.0 features. The MCP server configuration display has been redesigned with cleaner visual formatting, making it easier to copy the JSON configuration without accidentally including border characters. The README now properly highlights v2.2.0's provider-aware features, BMAD v6 support, and the transition from output-styles to SessionStart hooks.

### 📋 Changes

#### ✨ Improvements
- **Installer UX**: Split MCP configuration display into three sections for cleaner formatting
  - Top boxed section with intro and description
  - Middle section (no box) showing only the JSON config for easy copy-paste
  - Bottom boxed section with setup links and guides
  - Prevents accidental copying of border characters when copying JSON config

#### 📚 Documentation
- **README**: Updated latest release section to showcase v2.2.0 features
  - Provider-aware voice switching
  - **BMAD v6 support** with full backward compatibility to v4
  - MCP NPX configuration improvements
  - Improved installer UX highlights
  - Better voice mapping details
- **Architecture Change**: Documented transition from output-styles to SessionStart hooks
  - SessionStart hook now automatically loads TTS protocol on every session
  - Cleaner, more reliable activation mechanism
  - No need for manual output-style selection

### 🎯 User Impact

**For New Users**: The improved installer display makes it much easier to copy the MCP server configuration into your `~/.claude/mcp.json` file without formatting issues. You'll also benefit from the new SessionStart hook architecture which automatically activates TTS on every Claude Code session.

**For Existing Users**: When running `npx agentvibes install` or viewing installation instructions, you'll see a cleaner, more professional display that's easier to read and use. Note that AgentVibes now uses SessionStart hooks instead of output-styles for automatic activation.

**BMAD Users**: Full support for BMAD-METHOD v6-alpha with automatic agent voice assignment, while maintaining complete backward compatibility with v4.

### 📦 Files Changed
- `README.md` - Updated v2.2.0 release highlights
- `src/installer.js` - Improved MCP configuration display formatting
- `.claude/github-star-reminder.txt` - Updated reminder state
- `AgentVibes.code-workspace` - Workspace configuration updates

---

## v2.2.0 - Provider-Aware Features, BMAD v6 Support & MCP Improvements (2025-11-02)

### 🤖 AI Summary

Major enhancements to multi-provider support, BMAD integration, and MCP server configuration! This release makes AgentVibes smarter about which TTS provider you're using and adds full support for BMAD-METHOD v6-alpha with complete backward compatibility to v4.

### 📋 Changes

#### ✨ New Features
- **Provider-Aware Voice Switching**: Automatically detects whether you're using ElevenLabs or Piper TTS
- **BMAD v6 Support**: Full support for BMAD-METHOD v6-alpha with backward compatibility to v4
- **Improved Voice Mappings**: Provider-aware BMAD agent voices (PM: Ryan on Piper, Analyst: Kristin)
- **SessionStart Hook Support**: Reorganized repository structure for better hook integration

#### 🔧 Fixes
- **MCP NPX Configuration**: Corrected NPX command configuration for seamless MCP server setup
- **Voice Manager**: Made `/agent-vibes:switch` and `voice-manager.sh` provider-aware
- **Installer Prompts**: Removed redundant BMAD enable messages and duplicate pause prompts
- **JSON Formatting**: Removed color codes from MCP JSON output for clean copy-paste

#### 📚 Documentation
- Added prominent macOS bash 5.x requirement to README
- Updated documentation to remove deprecated output-style references
- Improved BMAD v6 TTS support documentation

### 🎯 User Impact

**Provider Awareness**: AgentVibes now intelligently works with both ElevenLabs and Piper TTS providers without manual configuration. Voice switching commands automatically use the correct provider's voice list.

**BMAD Integration**: If you're using BMAD-METHOD (v4 or v6), AgentVibes will automatically assign appropriate voices to each agent based on your TTS provider, with full backward compatibility.

**MCP Setup**: The corrected NPX configuration means MCP server setup is now seamless with the command: `npx -y --package=agentvibes agentvibes-mcp-server`

### 📦 Commits Since v2.1.5
```
01f5283 docs: Update README version to v2.2.0
ca47e74 chore: Release v2.2.0
8b6cae9 Merge v6-alpha: Provider-aware features, BMAD improvements, MCP NPX fix
a9c5439 fix: Correct MCP server NPX configuration
9965372 chore: Bump version to 2.2.0-beta.9
3d2c9da feat: Set BMAD analyst voice to Kristin (Piper)
0241dc0 feat: Make BMAD voice mappings provider-aware
bfd887d feat: Change BMAD Project Manager voice to Ryan (Piper)
34ae021 chore: Bump version to 2.2.0-beta.8
041c475 fix: Make /agent-vibes:switch and voice-manager.sh provider-aware
eb0b3ec fix: Remove color codes from MCP JSON for clean copy-paste
0ae1c4d fix: Remove redundant BMAD enable message and simplify prompts
cf6e1cd fix: Remove duplicate 'recent changes' pause in installer
d01de85 docs: Remove deprecated output-style references
ffa1696 feat: Add BMAD v6 TTS support and improve installer UX
24d77f3 chore: Bump version to 2.2.0-beta.2
18ce2d3 refactor: Reorganize repository structure and add SessionStart hook support
8dec688 chore: Bump version to 2.2.0-beta.1 for beta release
ccad898 feat: Add BMAD-METHOD v6-alpha support with backward compatibility
```

---

## Previous Releases

For release notes prior to v2.2.0, please see the [GitHub Releases page](https://github.com/paulpreibisch/AgentVibes/releases).
