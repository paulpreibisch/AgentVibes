# HuggingFace Setup Guide for AgentVibes Custom Voices

This guide will help you create and upload the custom Piper voices (Kristin, Jenny, Tracy) to HuggingFace.

---

## Step 1: Create HuggingFace Account (if needed)

1. Go to https://huggingface.co/join
2. Sign up for a free account
3. Verify your email

---

## Step 2: Create Access Token

1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Name it: `agentvibes-voices-upload`
4. Select role: **Write**
5. Click "Generate token"
6. **Copy the token** - you'll need it in the next step

---

## Step 3: Login via CLI

In your terminal, run:

```bash
huggingface-cli login
```

Paste your token when prompted.

---

## Step 4: Create Model Repository

### Option A: Via Web UI (Easier)

1. Go to https://huggingface.co/new
2. Repository name: `piper-custom-voices`
3. License: Select **"apache-2.0"**
4. Click "Create model"

### Option B: Via CLI

```bash
huggingface-cli repo create piper-custom-voices --type model --license apache-2.0
```

---

## Step 5: Download Voice Files

Run this script to download all three voices:

```bash
cd /home/fire/claude/AgentVibes/mcp-server/voices

# Download Kristin (Public Domain)
curl -L "https://sfo3.digitaloceanspaces.com/bkmdls/kristin.onnx" -o kristin.onnx
curl -L "https://sfo3.digitaloceanspaces.com/bkmdls/kristin.onnx.json" -o kristin.onnx.json

# Download Jenny (CC BY)
curl -L "https://sfo3.digitaloceanspaces.com/bkmdls/jenny.onnx" -o jenny.onnx
curl -L "https://sfo3.digitaloceanspaces.com/bkmdls/jenny.onnx.json" -o jenny.onnx.json

# Download Tracy/ManyVoice (Public Domain)
curl -L "https://sfo3.digitaloceanspaces.com/bkmdls/mv2.onnx" -o tracy.onnx
curl -L "https://sfo3.digitaloceanspaces.com/bkmdls/mv2.onnx.json" -o tracy.onnx.json
```

---

## Step 6: Create Model Card (README.md)

Create a file at `mcp-server/voices/README.md`:

```markdown
---
license: apache-2.0
tags:
- text-to-speech
- piper
- tts
- voice-synthesis
language:
- en
---

# AgentVibes Custom Piper Voices

High-quality custom Piper TTS voices for the AgentVibes project.

## Voices Included

### 1. Kristin
- **Type:** US English female
- **License:** Public Domain
- **Quality:** Medium (2000 epochs)
- **Creator:** Bryce Beattie
- **Source:** https://brycebeattie.com/files/tts/

### 2. Jenny
- **Type:** UK English female (Irish accent)
- **License:** CC BY (Attribution required)
- **Quality:** High
- **Creator:** Bryce Beattie
- **Source:** https://brycebeattie.com/files/tts/
- **Original Dataset:** Dioco (Kaggle)

### 3. Tracy (ManyVoice)
- **Type:** Multi-speaker (16 voices: 12 US, 4 UK)
- **License:** Public Domain
- **Quality:** Medium (400 epochs)
- **Creator:** Bryce Beattie
- **Source:** https://brycebeattie.com/files/tts/

## Usage

### With AgentVibes

These voices are automatically available when using AgentVibes with Piper TTS provider.

Install AgentVibes:
```bash
npx agentvibes@beta install
```

### Manual Download

```bash
# Download all voices
git clone https://huggingface.co/agentvibes/piper-custom-voices

# Or download individual voices
wget https://huggingface.co/agentvibes/piper-custom-voices/resolve/main/kristin.onnx
wget https://huggingface.co/agentvibes/piper-custom-voices/resolve/main/kristin.onnx.json
```

### With Piper TTS

```bash
echo "Hello from Kristin" | piper \
  --model kristin.onnx \
  --output_file output.wav
```

## Attribution

All voices created by **Bryce Beattie** (https://brycebeattie.com/files/tts/)

- **Kristin & Tracy:** Public Domain (LibriVox recordings)
- **Jenny:** CC BY attribution required (Dioco dataset)

## License

- **Repository License:** Apache 2.0
- **Voice Licenses:** See individual voice descriptions above
- **Creator's Permission:** "Feel free to use these for any legal and ethical purpose. If somebody wants to upload these to HuggingFace or somewhere similar, you have my blessing." — Bryce Beattie

## Links

- **AgentVibes:** https://github.com/paulpreibisch/AgentVibes
- **Piper TTS:** https://github.com/rhasspy/piper
- **Voice Creator:** https://brycebeattie.com/files/tts/
```

---

## Step 7: Upload to HuggingFace

```bash
cd /home/fire/claude/AgentVibes/mcp-server/voices

# Upload all files
huggingface-cli upload agentvibes/piper-custom-voices . . --repo-type model
```

This will upload:
- `kristin.onnx` + `kristin.onnx.json`
- `jenny.onnx` + `jenny.onnx.json`
- `tracy.onnx` + `tracy.onnx.json`
- `README.md`

---

## Step 8: Verify Upload

1. Go to https://huggingface.co/agentvibes/piper-custom-voices
2. You should see all 7 files (6 voice files + README)
3. Check that README displays properly

---

## Step 9: Update AgentVibes Download Script

The download URLs will be:
```
https://huggingface.co/agentvibes/piper-custom-voices/resolve/main/kristin.onnx
https://huggingface.co/agentvibes/piper-custom-voices/resolve/main/kristin.onnx.json
https://huggingface.co/agentvibes/piper-custom-voices/resolve/main/jenny.onnx
https://huggingface.co/agentvibes/piper-custom-voices/resolve/main/jenny.onnx.json
https://huggingface.co/agentvibes/piper-custom-voices/resolve/main/tracy.onnx
https://huggingface.co/agentvibes/piper-custom-voices/resolve/main/tracy.onnx.json
```

Update `.claude/hooks/piper-download-voices.sh` to use these URLs.

---

## Troubleshooting

### "Repository not found"
Make sure you created the repository first (Step 4)

### "Authentication failed"
Re-run `huggingface-cli login` with your token

### "File too large"
HuggingFace supports files up to 50GB - our voices are ~64MB each, well under the limit

---

## Next Steps

After upload:
1. Test downloads work from HuggingFace URLs
2. Update AgentVibes download script
3. Update documentation
4. Announce custom voices in README
