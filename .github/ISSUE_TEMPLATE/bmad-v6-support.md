# Add Support for BMAD-METHOD v6-Alpha

## 🎯 Overview

Add backward-compatible support for BMAD-METHOD v6-alpha while maintaining full compatibility with existing v4 installations.

## 📊 Background

BMAD-METHOD v6-alpha represents a complete architectural rewrite:
- **v4 (current)**: Multiple `.bmad-*` directories (`.bmad-core/`, `.bmad-game-dev/`, etc.)
- **v6-alpha (new)**: Unified `bmad/` directory with central manifest system

AgentVibes currently only detects v4 installations. We need to support both versions without breaking existing users.

## 🔍 Current State

**Current Detection Logic** (`src/installer.js:798-803`):
```javascript
const bmadManifestPath = path.join(targetDir, '.bmad-core', 'install-manifest.yaml');
let bmadDetected = false;
try {
  await fs.access(bmadManifestPath);
  bmadDetected = true;
} catch {}
```

**Problem**: Only detects v4, ignoring v6-alpha installations.

## 🎯 Goals

1. ✅ Detect both BMAD v4 and v6-alpha installations
2. ✅ Resolve configuration paths dynamically based on version
3. ✅ Maintain 100% backward compatibility with v4
4. ✅ Auto-enable BMAD plugin for both versions
5. ✅ Show detected BMAD version during installation
6. ✅ No breaking changes for existing users

## 📋 Implementation Plan

### Phase 1: Version Detection Module (30 min)

**Create: `src/bmad-detector.js`**

```javascript
import path from 'node:path';
import fs from 'node:fs/promises';
import yaml from 'js-yaml';

/**
 * Detect BMAD installation and version
 * @param {string} targetDir - Directory to check
 * @returns {Promise<Object>} Detection result with version info
 */
export async function detectBMAD(targetDir) {
  // Check v6 first (newer version)
  const v6Manifest = path.join(targetDir, 'bmad/_cfg/manifest.yaml');
  try {
    await fs.access(v6Manifest);
    const manifestContent = await fs.readFile(v6Manifest, 'utf8');
    const manifest = yaml.load(manifestContent);

    return {
      version: 6,
      detailedVersion: manifest.installation?.version || '6.0.0-alpha.x',
      manifestPath: v6Manifest,
      configPath: path.join(targetDir, 'bmad/core/config.yaml'),
      bmadPath: path.join(targetDir, 'bmad'),
      installed: true
    };
  } catch {}

  // Check v4 (legacy)
  const v4Manifest = path.join(targetDir, '.bmad-core/install-manifest.yaml');
  try {
    await fs.access(v4Manifest);
    return {
      version: 4,
      detailedVersion: '4.x',
      manifestPath: v4Manifest,
      configPath: path.join(targetDir, '.bmad-core/config.yaml'),
      bmadPath: path.join(targetDir, '.bmad-core'),
      installed: true
    };
  } catch {}

  // Not installed
  return { version: null, installed: false };
}

/**
 * Get BMAD configuration file path for detected version
 * @param {Object} detection - Result from detectBMAD()
 * @returns {string|null} Path to config.yaml or null
 */
export function getBMADConfigPath(detection) {
  return detection.installed ? detection.configPath : null;
}
```

**Dependencies**: Add `js-yaml` to `package.json` for YAML parsing.

### Phase 2: Update Installer (30 min)

**Modify: `src/installer.js`**

Replace lines 798-803 with:

```javascript
import { detectBMAD } from './bmad-detector.js';

// ... inside install() function ...

// Check for BMAD installation (both v4 and v6)
const bmadDetection = await detectBMAD(targetDir);
const bmadDetected = bmadDetection.installed;

if (bmadDetected) {
  const versionLabel = bmadDetection.version === 6
    ? `v6 (${bmadDetection.detailedVersion})`
    : 'v4';

  console.log(chalk.green(`\n🎉 BMAD-METHOD ${versionLabel} detected!`));
  console.log(chalk.gray(`   Location: ${bmadDetection.bmadPath}`));

  // Auto-enable BMAD plugin
  const bmadConfigDir = path.join(targetDir, '.agentvibes', 'bmad');
  const enabledFlagPath = path.join(bmadConfigDir, 'bmad-voices-enabled.flag');

  await fs.mkdir(bmadConfigDir, { recursive: true });
  await fs.writeFile(enabledFlagPath, '');

  // Create activation instructions (version-aware)
  const activationInstructionsPath = path.join(claudeDir, 'activation-instructions');

  try {
    await fs.access(activationInstructionsPath);
  } catch {
    const activationContent = generateActivationInstructions(bmadDetection.version);
    await fs.writeFile(activationInstructionsPath, activationContent);
    console.log(chalk.green('📝 Created BMAD activation instructions'));
  }
}
```

Add helper function:

```javascript
function generateActivationInstructions(version) {
  const configPathExample = version === 6
    ? 'bmad/core/config.yaml'
    : '.bmad-core/config.yaml';

  return `# BMAD Agent Activation Instructions (v${version})

When a BMAD agent activates, follow these steps EXACTLY:

## STEP 3.5a: Create BMAD Context File (CRITICAL)

**IMMEDIATELY after agent identification, create the context file:**

\`\`\`bash
echo "$AGENT_ID" > .bmad-agent-context
\`\`\`

Where \`$AGENT_ID\` is one of:
- \`pm\` (Product Manager)
- \`dev\` (Developer)
- \`qa\` (QA)
- \`architect\` (Architect)
- \`po\` (Product Owner)
- \`analyst\` (Analyst)
- \`sm\` (Scrum Master)
- \`ux-expert\` (UX Expert)
- \`bmad-master\` (BMAD Master)
- \`bmad-orchestrator\` (Orchestrator)

**Configuration Location**: ${configPathExample}

This file allows AgentVibes to:
1. Detect which BMAD agent is active
2. Look up the correct voice mapping
3. Automatically speak questions using the agent's assigned voice

## STEP 10: Clean Up on Exit

**Before exiting the agent, remove the context file:**

\`\`\`bash
rm -f .bmad-agent-context
\`\`\`

This ensures voice switching only happens when an agent is active.

**This is MANDATORY for BMAD voice integration to work!**
`;
}
```

Update success message (lines 882-899):

```javascript
if (bmadDetected) {
  const versionLabel = bmadDetection.version === 6
    ? `v${bmadDetection.detailedVersion}`
    : 'v4';

  console.log(
    boxen(
      chalk.green.bold(`🎉 BMAD-METHOD ${versionLabel} Detected!\n\n`) +
      chalk.white('✅ BMAD Voice Plugin: AUTO-ENABLED\n') +
      chalk.gray('Each BMAD agent will automatically use its assigned voice\n') +
      chalk.gray('and speak when activated!\n\n') +
      chalk.cyan('Commands:\n') +
      chalk.gray('  • /agent-vibes:bmad status - View agent voices\n') +
      chalk.gray('  • /agent-vibes:bmad set <agent> <voice> - Customize\n') +
      chalk.gray('  • /agent-vibes:bmad disable - Turn off if unwanted'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green',
      }
    )
  );
}
```

### Phase 3: Update BMAD Hook Scripts (45 min)

**Modify: `.claude/hooks/bmad-voice-manager.sh`**

Add version detection at the top:

```bash
#!/usr/bin/env bash

# Detect BMAD version
detect_bmad_version() {
    if [ -f "bmad/_cfg/manifest.yaml" ]; then
        # v6 detected
        echo "6"
        return 0
    elif [ -d ".bmad-core" ] || [ -d ".bmad-method" ]; then
        # v4 detected
        echo "4"
        return 0
    else
        # Not installed
        echo "0"
        return 1
    fi
}

# Get BMAD config path based on version
get_bmad_config_path() {
    local version=$(detect_bmad_version)

    if [ "$version" = "6" ]; then
        echo "bmad/core/config.yaml"
    elif [ "$version" = "4" ]; then
        echo ".bmad-core/config.yaml"
    else
        echo ""
    fi
}

# Rest of script uses: CONFIG_PATH=$(get_bmad_config_path)
```

**Modify: `.claude/hooks/bmad-tts-injector.sh`**

Add same detection logic and use it for path resolution:

```bash
#!/usr/bin/env bash

# Source the version detection functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/bmad-voice-manager.sh"

# Detect BMAD and get config path
BMAD_VERSION=$(detect_bmad_version)
BMAD_CONFIG=$(get_bmad_config_path)

if [ -z "$BMAD_CONFIG" ] || [ ! -f "$BMAD_CONFIG" ]; then
    # BMAD not installed or config not found
    exit 0
fi

# Read agent context and proceed with voice mapping
# ... rest of existing logic ...
```

### Phase 4: Documentation (30 min)

**Create: `docs/bmad-v6-support.md`**

Document:
- v6-alpha detection and support
- Differences between v4 and v6
- Migration path for v4→v6 users
- Troubleshooting version detection

**Update: `docs/bmad-plugin.md`**

Add section:
```markdown
## 🔄 BMAD Version Support

AgentVibes automatically detects and supports both BMAD v4 and v6-alpha:

- **v4 (Legacy)**: Uses `.bmad-core/` directory structure
- **v6-alpha (Current)**: Uses unified `bmad/` directory structure

The plugin automatically detects which version you have installed and configures paths accordingly. No manual configuration needed!

### How Detection Works

1. Checks for `bmad/_cfg/manifest.yaml` (v6)
2. Falls back to `.bmad-core/install-manifest.yaml` (v4)
3. Resolves configuration paths based on detected version

### Upgrading from v4 to v6

If you upgrade BMAD from v4 to v6-alpha:

1. Reinstall AgentVibes: `npx agentvibes update --yes`
2. AgentVibes will auto-detect the new v6 structure
3. All voice mappings will continue working

No manual intervention required!
```

**Update: `README.md`**

Add to BMAD Plugin section (line 233-241):

```markdown
**Version Support**: AgentVibes supports both BMAD v4 and v6-alpha installations. Version detection is automatic - just install BMAD and AgentVibes will detect and configure itself correctly!
```

### Phase 5: Testing (45 min)

**Test Scenarios**:

1. ✅ **v6-alpha Detection**
   - Install BMAD v6-alpha
   - Run `npx agentvibes install`
   - Verify: "BMAD-METHOD v6 (6.0.0-alpha.X) detected!"
   - Check: `.agentvibes/bmad/bmad-voices-enabled.flag` created

2. ✅ **v4 Detection (Backward Compatibility)**
   - Install BMAD v4
   - Run `npx agentvibes install`
   - Verify: "BMAD-METHOD v4 detected!"
   - Check: Plugin still auto-enables

3. ✅ **No BMAD Installation**
   - Remove BMAD completely
   - Run `npx agentvibes install`
   - Verify: No BMAD detection messages
   - Check: Plugin not enabled

4. ✅ **Voice Manager Script**
   - Test with v6: `bash .claude/hooks/bmad-voice-manager.sh`
   - Test with v4: (same command)
   - Verify: Correct config paths resolved

5. ✅ **Update Scenario**
   - Install AgentVibes with v4
   - Upgrade BMAD to v6
   - Run `npx agentvibes update`
   - Verify: Detects new v6 installation

## 📦 Dependencies

**Add to `package.json`**:
```json
{
  "dependencies": {
    "js-yaml": "^4.1.0"
  }
}
```

## 🎯 Acceptance Criteria

- [ ] Detects BMAD v6-alpha installations via `bmad/_cfg/manifest.yaml`
- [ ] Detects BMAD v4 installations via `.bmad-core/install-manifest.yaml`
- [ ] Shows BMAD version during installation
- [ ] Resolves correct config paths for each version
- [ ] Auto-enables plugin for both versions
- [ ] No breaking changes for existing v4 users
- [ ] All tests pass (v4, v6, no-BMAD scenarios)
- [ ] Documentation updated
- [ ] Version detection works in hook scripts

## 🚀 Benefits

- **Future-Proof**: Ready for BMAD v6 general release
- **Zero Breaking Changes**: Existing v4 users unaffected
- **Clean Architecture**: Centralized version detection
- **User-Friendly**: Auto-detects and configures correctly
- **Easy Maintenance**: Single codebase, version-aware logic

## 📝 Notes

- BMAD v6 already uses `.claude/hooks/` (same as v4), so hook scripts are compatible
- Main difference is directory structure: `bmad/` vs `.bmad-core/`
- Configuration file location changes: `bmad/core/config.yaml` vs `.bmad-core/config.yaml`
- v6 has central manifest with version field: `bmad/_cfg/manifest.yaml`

## 🔗 Related

- BMAD-METHOD v6-alpha repository: https://github.com/bmad-code-org/BMAD-METHOD
- AgentVibes BMAD Plugin docs: `docs/bmad-plugin.md`
- Current implementation: `src/installer.js:798-803`

## ⏱️ Estimated Time

**Total: ~3 hours**
- Phase 1: Version Detection Module (~30 min)
- Phase 2: Update Installer (~30 min)
- Phase 3: Update Hook Scripts (~45 min)
- Phase 4: Documentation (~30 min)
- Phase 5: Testing (~45 min)

## 👥 Labels

- `enhancement`
- `bmad-integration`
- `backward-compatible`
- `v6-alpha`
