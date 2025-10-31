# macOS Testing Quick Start

## 🚀 TL;DR - Just Push Your Code!

**You don't need a Mac VPS!** GitHub Actions automatically tests on macOS for FREE.

## ✅ What You Get

Every push/PR automatically tests on:
- ✅ macOS 13 (Intel)
- ✅ macOS 14 (M1/M2)
- ✅ macOS 15 (Latest)
- ✅ Node 18, 20, 22
- ✅ Real audio stack (ffmpeg, afplay, mpv)

## 📊 View Results

1. **Push your code** → Tests run automatically
2. **Check PR** → See status at bottom
3. **Actions tab** → View detailed results

## 🎯 Manual Testing (If Needed)

### Trigger Manual Run
1. Go to GitHub → **Actions** tab
2. Select **macOS Test Suite**
3. Click **Run workflow**

### Run Locally (If You Have a Mac)
```bash
# Install BATS
brew install bats-core

# Run tests
npm test
```

## 🐛 Debugging Failed Tests

### View Logs
1. Go to failed test in Actions tab
2. Expand steps to see output
3. Download artifacts if needed

### Test Locally
```bash
# Run specific test
bats test/unit/play-tts.bats

# Verbose output
npm run test:verbose
```

## 💰 Cost

**$0** - GitHub provides macOS runners for free on public repos!

## 📖 Full Documentation

See [docs/macos-testing.md](../docs/macos-testing.md) for complete details.

---

**Bottom line:** Just push your code. GitHub Actions handles the rest! 🎉
