# Voice Models Directory

This directory contains Piper TTS voice models used by AgentVibes.

## Why are voice files not in git?

Voice model files (.onnx) are large (60-74MB each) and should not be stored in git repositories. They are excluded via `.gitignore` and `.npmignore`.

## Bundled Voices

The following voices are bundled with AgentVibes for development and testing:

- **16Speakers.onnx** (74MB) - Multi-speaker model with 16 different voices
- **jenny.onnx** (61MB) - Female US English voice
- **kristin.onnx** (61MB) - Female US English voice

## Getting the Voice Models

### For Users

Voice models are downloaded automatically when you use AgentVibes:

```bash
# Models download on first use via the installer
npx agentvibes
```

### For Developers

Download the bundled voice models:

```bash
# From the project root
curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/16Speakers/medium/en_US-16Speakers-medium.onnx" -o mcp-server/voices/16Speakers.onnx
curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/16Speakers/medium/en_US-16Speakers-medium.onnx.json" -o mcp-server/voices/16Speakers.onnx.json

curl -L "https://sfo3.digitaloceanspaces.com/bkmdls/jenny.onnx" -o mcp-server/voices/jenny.onnx
curl -L "https://sfo3.digitaloceanspaces.com/bkmdls/jenny.onnx.json" -o mcp-server/voices/jenny.onnx.json

curl -L "https://sfo3.digitaloceanspaces.com/bkmdls/kristin.onnx" -o mcp-server/voices/kristin.onnx
curl -L "https://sfo3.digitaloceanspaces.com/bkmdls/kristin.onnx.json" -o mcp-server/voices/kristin.onnx.json
```

### For CI/Testing

The test suite automatically copies the bundled 16Speakers model from `mcp-server/voices/` to the test environment. If you need to run tests locally without the bundled voices, download 16Speakers.onnx first.

## File Structure

```
mcp-server/voices/
├── README.md                 (this file)
├── 16Speakers.onnx          (not in git - download separately)
├── 16Speakers.onnx.json     (not in git - download separately)
├── jenny.onnx               (not in git - download separately)
├── jenny.onnx.json          (not in git - download separately)
├── kristin.onnx             (not in git - download separately)
├── kristin.onnx.json        (not in git - download separately)
└── preview-16speakers.sh    (preview script)
```

## More Information

- Voice models are from [Piper TTS](https://github.com/rhasspy/piper)
- Full voice catalog: https://huggingface.co/rhasspy/piper-voices
- License: Most voices are Public Domain or MIT licensed
