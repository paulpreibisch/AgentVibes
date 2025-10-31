# macOS Testing with GitHub Actions

This document explains how AgentVibes is tested on macOS using GitHub Actions, and how you can contribute to macOS testing.

## 🎯 Overview

AgentVibes uses GitHub Actions to automatically test on macOS runners, ensuring compatibility across different macOS versions and architectures (Intel and Apple Silicon).

## 📋 Test Coverage

### Automated Tests Run On:
- **macOS Versions**: macOS 13 (Intel), macOS 14 (M1), macOS 15 (latest)
- **Node Versions**: 18, 20, 22
- **Architectures**: x86_64 (Intel) and arm64 (Apple Silicon)

### What Gets Tested:

1. **Unit Tests** - All BATS test suites run on macOS
2. **Installation Process** - npm package installation
3. **Audio Tools** - ffmpeg, afplay, mpv availability
4. **Piper TTS** - Binary availability for Intel/ARM architectures
5. **ElevenLabs API** - Mock API integration tests
6. **Python/MCP** - MCP server dependencies
7. **Audio Generation** - Actual audio file creation using ffmpeg

## 🚀 Workflows

### Main Test Workflow (`.github/workflows/test.yml`)
Runs on every push and PR to `master` branch:
- Tests on both Ubuntu and macOS
- Uses Node 18 and 20
- Fast execution for quick feedback

### Dedicated macOS Workflow (`.github/workflows/test-macos.yml`)
More comprehensive macOS-specific testing:
- Tests on macOS 13, 14, and 15
- Tests Node 18, 20, and 22
- Detailed system information gathering
- Architecture-specific Piper TTS validation
- Audio playback tool verification

## 🔧 What's Tested on macOS

### System Compatibility
```bash
✅ macOS version detection (sw_vers)
✅ Architecture detection (Intel vs Apple Silicon)
✅ Node.js version compatibility
✅ Shell environment (zsh/bash)
```

### Audio Stack
```bash
✅ afplay (native macOS audio player)
✅ ffmpeg (audio conversion)
✅ mpv (alternative audio player)
✅ Audio device detection
✅ Audio file generation
```

### Dependencies
```bash
✅ BATS test framework (via Homebrew)
✅ Python 3 and pip
✅ MCP package installation
✅ npm dependencies
```

### AgentVibes Features
```bash
✅ ElevenLabs API integration (mock)
✅ Piper TTS binary availability
✅ Voice configuration
✅ Audio file management
✅ Installation scripts
```

## 🧪 Running Tests Locally on macOS

### Prerequisites
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install BATS
brew install bats-core

# Install audio tools
brew install ffmpeg mpv
```

### Run Tests
```bash
# Clone the repository
git clone https://github.com/paulpreibisch/AgentVibes.git
cd AgentVibes

# Install dependencies
npm install

# Run all tests
npm test

# Run tests with verbose output
npm run test:verbose
```

### Test Specific Components
```bash
# Test play-tts functionality
bats test/unit/play-tts.bats

# Test voice management
bats test/unit/voice-manager.bats

# Test personality features
bats test/unit/personality-manager.bats

# Test provider switching
bats test/unit/provider-manager.bats
```

## 🐛 Debugging Test Failures

### Check System Info
```bash
# macOS version
sw_vers

# Architecture
uname -m

# Node version
node --version

# Check audio devices
system_profiler SPAudioDataType

# Check for audio tools
which afplay ffmpeg mpv
```

### Common Issues

**BATS not found:**
```bash
brew install bats-core
```

**ffmpeg not found:**
```bash
brew install ffmpeg
```

**Python MCP issues:**
```bash
python3 -m pip install --upgrade mcp
```

**Permission errors:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

## 📊 GitHub Actions Features

### Matrix Testing
Tests run in parallel across multiple configurations:
```yaml
strategy:
  matrix:
    os: [macos-13, macos-14, macos-15]
    node-version: ['18', '20', '22']
```

This creates **9 test jobs** (3 OS × 3 Node versions) that run simultaneously.

### Manual Triggers
You can manually trigger the macOS test workflow:
1. Go to **Actions** tab on GitHub
2. Select **macOS Test Suite**
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

### Artifact Collection
Failed tests automatically upload:
- Audio files from `~/.claude/audio/`
- Test logs from `/tmp/test-*.log`
- Retained for 7 days for debugging

## 🎯 Benefits of macOS Testing

### Free Testing
- GitHub provides **macOS runners for free** on public repositories
- No need to rent Mac VPS or cloud services
- Automated on every commit

### Real Hardware
- Tests run on actual macOS environments
- Intel (x86_64) and Apple Silicon (arm64) coverage
- Real filesystem and audio stack

### Coverage
- **Intel Macs**: macOS 13 runner
- **Apple Silicon**: macOS 14/15 runners
- **Latest macOS**: Always available

### Confidence
- Know it works before users install
- Catch macOS-specific bugs early
- Validate audio tools on macOS

## 💡 Contributing macOS Tests

### Add New Test Cases
```bash
# Create new test file
touch test/unit/my-feature.bats

# Add test
cat > test/unit/my-feature.bats << 'EOF'
#!/usr/bin/env bats

load ../helpers/test-helper

@test "my feature works on macOS" {
  run my-command
  [ "$status" -eq 0 ]
}
EOF
```

### Test macOS-Specific Features
```bash
@test "uses afplay on macOS" {
  [[ "$OSTYPE" == "darwin"* ]] || skip "macOS only"

  run detect-audio-player
  [[ "$output" == *"afplay"* ]]
}
```

### Submit PR with Tests
1. Add test cases to `test/unit/*.bats`
2. Verify tests pass locally: `npm test`
3. Submit PR - GitHub Actions runs on macOS automatically
4. Review test results in PR checks

## 🔍 Viewing Test Results

### In Pull Requests
- Check status at bottom of PR
- Click **Details** next to "Test on macos-latest"
- View full test output and system info

### In Actions Tab
1. Go to **Actions** tab
2. Click on workflow run
3. Select matrix job (e.g., "Test on macos-14")
4. Expand test steps to see output

### Download Artifacts
If tests fail:
1. Scroll to bottom of failed job
2. Click **Artifacts** section
3. Download test logs for debugging

## 🚦 Status Badges

The README shows test status:
```markdown
[![Test Suite](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml/badge.svg)](https://github.com/paulpreibisch/AgentVibes/actions/workflows/test.yml)
```

This badge shows if tests are passing on latest commit (including macOS tests).

## 📈 Future Improvements

Planned enhancements:
- [ ] Test actual ElevenLabs API with secrets
- [ ] Test Piper TTS full installation on macOS
- [ ] Test Claude Desktop integration
- [ ] Performance benchmarks on Apple Silicon
- [ ] Audio quality validation
- [ ] Test with different macOS audio devices

## 🤝 Community Testing

While automated tests are great, real-world testing helps:
- Test on your Mac and report issues
- Try different macOS versions
- Test with various audio setups
- Share feedback in GitHub Issues

**Your Mac testing helps make AgentVibes better for everyone!** 🎉

---

**Questions?** Open an issue: https://github.com/paulpreibisch/AgentVibes/issues
