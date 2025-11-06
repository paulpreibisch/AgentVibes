# AgentVibes Release Notes

## v2.3.0 - Command Visibility Management & Maintenance (2025-11-06)

### 🤖 AI Summary

This minor release introduces command visibility management features allowing MCP users to hide/show AgentVibes slash commands, plus important maintenance improvements. Users who primarily interact with AgentVibes through MCP tools can now declutter their Claude Code command palette by hiding slash commands, while still retaining full MCP functionality. The release also includes improved .gitignore rules to exclude runtime and user-generated files from version control.

### 📋 Changes

#### ✨ New Features
- **Command Visibility Management**: New `/agent-vibes:hide` and `/agent-vibes:show` commands
  - Hide all AgentVibes slash commands from Claude Code interface
  - Keeps only hide/show commands visible when hidden
  - MCP functionality remains completely unaffected
  - Commands safely backed up to `.claude/.agentvibes-backup/`
  - Perfect for users who prefer MCP tools over slash commands

#### 🔧 Maintenance
- **Enhanced .gitignore**: Improved exclusion rules for runtime files
  - `.claude/plugins/*.flag` - Plugin state flags
  - `.claude/piper-voices/` - Downloaded voice models
  - `.claude/piper-voices-dir.txt` - Voice directory config
  - `.claude/github-star-reminder.txt` - UI reminder state
  - `.claude/.agentvibes-backup/` - Hidden command backups
  - `.claude/.agentvibes-hidden.flag` - Command visibility state

#### 📚 Documentation
- **README**: Updated version to v2.2.3
- **MCP Config**: Cleaned up `.mcp-minimal.json` configuration

### 🎯 User Impact

**For MCP Users**: If you primarily use AgentVibes through MCP tools and find the slash commands cluttering your command palette, you can now use `/agent-vibes:hide` to clean up the interface. Your MCP functionality will work exactly the same. Use `/agent-vibes:show` anytime to restore commands.

**For All Users**: The improved .gitignore ensures that runtime-generated files (voice models, state flags, reminders) are never accidentally committed to version control, keeping your git history clean.

**Command Organization**: The 29 AgentVibes slash commands can now be completely hidden with a single command, leaving only the hide/show toggles visible. This is ideal for users who:
- Prefer using MCP tools directly
- Want a cleaner command palette
- Are setting up AgentVibes for others
- Have memorized their favorite commands

### 📦 Files Changed
- `.claude/commands/agent-vibes/hide.md` - NEW: Hide commands feature
- `.claude/commands/agent-vibes/show.md` - NEW: Show commands feature
- `.gitignore` - Enhanced runtime file exclusions
- `.mcp-minimal.json` - Configuration cleanup
- `README.md` - Version update to v2.2.3

### 🔄 Breaking Changes
None. This release is fully backward compatible.

### 🚀 Upgrade Notes
Simply run `npx agentvibes@latest` to get the new features. Existing configurations and settings are preserved.

---

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