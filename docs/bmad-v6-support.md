# BMAD-METHOD v6-Alpha Support

## Overview

AgentVibes now supports both **BMAD-METHOD v4** and **v6-alpha** installations, providing seamless backward compatibility while embracing the new architecture.

## Version Differences

### BMAD v4 (Legacy)
- **Directory Structure**: Multiple `.bmad-*` directories (`.bmad-core/`, `.bmad-game-dev/`, etc.)
- **Manifest Location**: `.bmad-core/install-manifest.yaml`
- **Config Location**: `.bmad-core/config.yaml`
- **Status**: Fully supported (backward compatible)

### BMAD v6-Alpha (Current)
- **Directory Structure**: Unified `bmad/` directory with central manifest
- **Manifest Location**: `bmad/_cfg/manifest.yaml`
- **Config Location**: `bmad/core/config.yaml`
- **Features**: Central manifest system, improved organization
- **Status**: Fully supported

## Automatic Detection

AgentVibes automatically detects which version you have installed:

```bash
# During installation
npx agentvibes install

# Output for v6-alpha:
🎉 BMAD-METHOD v6 (6.0.0-alpha.x) detected!
   Location: /path/to/bmad

# Output for v4:
🎉 BMAD-METHOD v4 detected!
   Location: /path/to/.bmad-core
```

### Detection Priority

1. **v6-alpha** is checked first (newer version)
2. **v4** is checked as fallback (legacy version)
3. If neither is found, BMAD plugin is not enabled

## How It Works

### JavaScript Detection (`src/bmad-detector.js`)

The detector module checks for version-specific markers:

```javascript
// v6 check
const v6Manifest = path.join(targetDir, 'bmad/_cfg/manifest.yaml');

// v4 check
const v4Manifest = path.join(targetDir, '.bmad-core/install-manifest.yaml');
```

### Bash Detection (`.claude/hooks/bmad-voice-manager.sh`)

Shell scripts include version detection functions:

```bash
detect_bmad_version() {
    if [[ -f "bmad/_cfg/manifest.yaml" ]]; then
        echo "6"  # v6 detected
    elif [[ -f ".bmad-core/install-manifest.yaml" ]]; then
        echo "4"  # v4 detected
    else
        echo "0"  # Not installed
    fi
}
```

## Configuration Paths

The system resolves configuration paths based on detected version:

| Version | Config Path | Manifest Path |
|---------|-------------|---------------|
| v4 | `.bmad-core/config.yaml` | `.bmad-core/install-manifest.yaml` |
| v6-alpha | `bmad/core/config.yaml` | `bmad/_cfg/manifest.yaml` |

## Upgrading from v4 to v6-Alpha

If you upgrade BMAD from v4 to v6-alpha:

1. **Upgrade BMAD** following the BMAD-METHOD upgrade instructions
2. **Reinstall AgentVibes**:
   ```bash
   npx agentvibes update --yes
   ```
3. AgentVibes will automatically detect the new v6 structure
4. All voice mappings will continue working

**No manual configuration needed!**

## Voice Plugin Compatibility

The BMAD voice plugin works identically on both versions:

- **Auto-Detection**: Plugin auto-enables when BMAD is detected (any version)
- **Voice Mappings**: Same voice mapping format for both versions
- **Agent Context**: Same `.bmad-agent-context` file mechanism
- **Commands**: Same `/agent-vibes:bmad` commands work on both

## Testing Your Installation

After installing or updating AgentVibes, verify BMAD detection:

```bash
# Check which version is detected
ls -la | grep bmad

# You should see either:
# - bmad/           (v6-alpha)
# - .bmad-core/     (v4)

# Verify plugin is enabled
ls -la .agentvibes/bmad/bmad-voices-enabled.flag

# Check activation instructions
cat .claude/activation-instructions
```

The activation instructions will show the correct version:

```markdown
# BMAD Agent Activation Instructions (v6)  ← or (v4)

**Configuration Location**: bmad/core/config.yaml  ← or .bmad-core/config.yaml
```

## Troubleshooting

### "BMAD not detected" but I have BMAD installed

**Check directory structure**:
```bash
# For v6-alpha, verify:
ls -la bmad/_cfg/manifest.yaml

# For v4, verify:
ls -la .bmad-core/install-manifest.yaml
```

### Plugin works on v4 but not v6-alpha

1. **Verify v6 installation**:
   ```bash
   cat bmad/_cfg/manifest.yaml
   ```

2. **Reinstall AgentVibes**:
   ```bash
   npx agentvibes update --yes
   ```

3. **Check detection**:
   ```bash
   node -e "import('./src/bmad-detector.js').then(m => m.detectBMAD(process.cwd()).then(console.log))"
   ```

### Wrong version detected

AgentVibes prioritizes v6 over v4. If both exist in your directory:

- **v6** will be detected (correct behavior)
- Remove old `.bmad-core/` if you've migrated to v6

## Technical Details

### Version Detection Algorithm

```javascript
export async function detectBMAD(targetDir) {
  // 1. Check v6 (newest)
  const v6Manifest = path.join(targetDir, 'bmad/_cfg/manifest.yaml');
  if (await fileExists(v6Manifest)) {
    return { version: 6, ... };
  }

  // 2. Check v4 (legacy)
  const v4Manifest = path.join(targetDir, '.bmad-core/install-manifest.yaml');
  if (await fileExists(v4Manifest)) {
    return { version: 4, ... };
  }

  // 3. Not installed
  return { version: null, installed: false };
}
```

### Configuration Resolution

```javascript
// Dynamically resolved based on version
const configPath = detection.version === 6
  ? 'bmad/core/config.yaml'
  : '.bmad-core/config.yaml';
```

## Benefits

✅ **Future-Proof**: Ready for BMAD v6 general release
✅ **Zero Breaking Changes**: Existing v4 users unaffected
✅ **Clean Architecture**: Centralized version detection
✅ **User-Friendly**: Auto-detects and configures correctly
✅ **Easy Maintenance**: Single codebase, version-aware logic

## Related Documentation

- [BMAD Plugin Guide](bmad-plugin.md)
- [Installation Guide](../README.md)
- [BMAD-METHOD Repository](https://github.com/bmad-code-org/BMAD-METHOD)

## Support

If you encounter issues with version detection:

1. Check this documentation
2. Verify your BMAD installation
3. Report issues: https://github.com/paulpreibisch/AgentVibes/issues

Include in your report:
- AgentVibes version: `npx agentvibes --version`
- BMAD version and directory structure
- Output of `ls -la | grep bmad`
