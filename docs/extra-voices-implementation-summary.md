# Extra Piper Voices - Implementation Summary

## Problem Statement

Users encountered difficulties when trying to download and use extra custom Piper voices (jenny, kristin, 16Speakers):

1. **Download Issue**: `tracy.onnx` file was incorrectly named (should be `16Speakers.onnx`)
2. **Voice Registration Issue**: Custom voices couldn't be switched to because they didn't match the Piper voice pattern detection (`*_*-*`)
3. **Multi-Speaker Support**: The 16Speakers model contains 16 individual voices that couldn't be accessed individually

## Solution Implemented

### 1. Fixed Download Script ✅

**File**: `.claude/hooks/download-extra-voices.sh`

**Changes**:
- Already uses correct filename `16Speakers.onnx` (not `tracy.onnx`)
- Downloads three custom voices:
  - `kristin.onnx` (64MB) - US English female
  - `jenny.onnx` (64MB) - UK English female with Irish accent
  - `16Speakers.onnx` (77MB) - Multi-speaker with 12 US + 4 UK voices

### 2. Enhanced Voice Manager ✅

**File**: `.claude/hooks/voice-manager.sh`

**Changes**:
- **Before**: Only detected Piper voices matching pattern `*_*-*` (e.g., `en_US-lessac-medium`)
- **After**: Scans voice directory for ALL `.onnx` files, including custom voices

**New Logic**:
```bash
# For Piper provider:
# 1. Check standard voice directory for .onnx files (jenny, kristin, 16Speakers)
# 2. If not found, check multi-speaker registry (Cori_Samuel, Rose_Ibex, etc.)
# 3. If multi-speaker found, store model + speaker ID separately
```

**Result**: Users can now switch to custom voices:
- `/agent-vibes:switch jenny` ✅
- `/agent-vibes:switch kristin` ✅
- `/agent-vibes:switch 16Speakers` ✅

### 3. Multi-Speaker Registry ✅

**File**: `.claude/hooks/piper-multispeaker-registry.sh` (NEW)

**Purpose**: Maps individual speaker names to model files and speaker IDs

**Features**:
- Registry of all 16 speakers in the 16Speakers model
- Functions to lookup model and speaker ID by name
- Function to list all multi-speaker voices with descriptions

**Example Registry Entry**:
```bash
"Cori_Samuel:16Speakers:0:US English Female"
"Rose_Ibex:16Speakers:8:US English Female"
"Paul_Hampton:16Speakers:12:UK English Male"
```

**Usage**:
```bash
/agent-vibes:switch Cori_Samuel  # Uses 16Speakers.onnx with speaker ID 0
/agent-vibes:switch Rose_Ibex    # Uses 16Speakers.onnx with speaker ID 8
```

### 4. Multi-Speaker TTS Support ✅

**File**: `.claude/hooks/play-tts-piper.sh`

**Changes**:

**Voice Resolution**:
```bash
# Check for multi-speaker voice configuration
if [[ -f "tts-piper-model.txt" ]] && [[ -f "tts-piper-speaker-id.txt" ]]; then
  VOICE_MODEL=$(cat tts-piper-model.txt)      # e.g., "16Speakers"
  SPEAKER_ID=$(cat tts-piper-speaker-id.txt)  # e.g., "8"
fi
```

**TTS Synthesis**:
```bash
if [[ -n "$SPEAKER_ID" ]]; then
  # Multi-speaker: Pass speaker ID to Piper
  echo "$TEXT" | piper --model "$VOICE_PATH" --speaker "$SPEAKER_ID" --output_file "$OUTPUT"
else
  # Single-speaker: Standard synthesis
  echo "$TEXT" | piper --model "$VOICE_PATH" --output_file "$OUTPUT"
fi
```

## File Changes Summary

| File | Status | Changes |
|------|--------|---------|
| `download-extra-voices.sh` | ✅ Already Correct | Uses `16Speakers.onnx` (not tracy) |
| `voice-manager.sh` | ✅ Updated | Added Piper voice directory scanning, multi-speaker support |
| `piper-multispeaker-registry.sh` | ✅ Created | New registry for 16 speaker mappings |
| `play-tts-piper.sh` | ✅ Updated | Added multi-speaker voice resolution and speaker ID support |
| `docs/voice-registration-fix.md` | ✅ Created | Detailed problem analysis and solution design |
| `docs/extra-voices-implementation-summary.md` | ✅ Created | This file |

## Available Voices After Implementation

### Standard Custom Voices
- `jenny` - UK English female with Irish accent (CC BY)
- `kristin` - US English female (Public Domain)
- `16Speakers` - Access all 16 speakers at once (uses first speaker by default)

### Individual Multi-Speaker Voices (16Speakers Model)

**US English Speakers (12)**:
- `Cori_Samuel` (Female, ID: 0)
- `Kara_Shallenberg` (Female, ID: 1)
- `Kristin_Hughes` (Female, ID: 2)
- `Maria_Kasper` (Female, ID: 3)
- `Mike_Pelton` (Male, ID: 4)
- `Mark_Nelson` (Male, ID: 5)
- `Michael_Scherer` (Male, ID: 6)
- `James_K_White` (Male, ID: 7)
- `Rose_Ibex` (Female, ID: 8)
- `progressingamerica` (Male, ID: 9)
- `Steve_C` (Male, ID: 10)
- `Owlivia` (Female, ID: 11)

**UK English Speakers (4)**:
- `Paul_Hampton` (Male, ID: 12)
- `Jennifer_Dorr` (Female, ID: 13)
- `Emily_Cripps` (Female, ID: 14)
- `Martin_Clifton` (Male, ID: 15)

## Usage Examples

### Download Extra Voices
```bash
# Via MCP
mcp__agentvibes__download_extra_voices()

# Via slash command (when implemented)
/agent-vibes:provider download
```

### Switch to Custom Voice
```bash
# UK English female with Irish accent
/agent-vibes:switch jenny

# US English female
/agent-vibes:switch kristin
```

### Switch to Multi-Speaker Voice
```bash
# Use a specific speaker from 16Speakers model
/agent-vibes:switch Cori_Samuel    # US Female speaker
/agent-vibes:switch Rose_Ibex      # US Female speaker
/agent-vibes:switch Paul_Hampton   # UK Male speaker
```

### List Available Voices
```bash
/agent-vibes:list
```

Output will show:
- Standard Piper voices (en_US-lessac-medium, etc.)
- Custom voices (jenny, kristin, 16Speakers)
- Multi-speaker voices (Cori_Samuel, Rose_Ibex, etc.)

## Technical Details

### State Files for Multi-Speaker Voices

When you switch to a multi-speaker voice, three files are created:

1. `.claude/tts-voice.txt` - Stores speaker name (e.g., "Cori_Samuel")
2. `.claude/tts-piper-model.txt` - Stores model file (e.g., "16Speakers")
3. `.claude/tts-piper-speaker-id.txt` - Stores speaker ID (e.g., "0")

### Voice Lookup Priority (Piper Provider)

1. **Standard voice files**: Check voice directory for `<name>.onnx`
2. **Multi-speaker registry**: Check registry for speaker name
3. **Error**: Show available voices if not found

### Piper TTS Command Format

**Single-speaker voice**:
```bash
piper --model /path/to/jenny.onnx --output_file output.wav
```

**Multi-speaker voice**:
```bash
piper --model /path/to/16Speakers.onnx --speaker 8 --output_file output.wav
```

## Testing Checklist

- [x] Download script uses correct filename (16Speakers.onnx)
- [x] Voice manager scans directory for custom voices
- [x] Multi-speaker registry created with all 16 speakers
- [x] Voice manager checks multi-speaker registry
- [x] play-tts-piper.sh reads speaker ID from config
- [x] play-tts-piper.sh passes --speaker flag to Piper
- [ ] Test: Download extra voices via MCP
- [ ] Test: Switch to jenny voice
- [ ] Test: Switch to kristin voice
- [ ] Test: Switch to Cori_Samuel (multi-speaker)
- [ ] Test: Play TTS with each voice
- [ ] Test: List voices shows all custom + multi-speaker

## Next Steps

1. **Test the implementation** with actual voice downloads and switching
2. **Update voice listing** to show custom and multi-speaker voices in organized sections
3. **Add MCP methods** for listing multi-speaker voices
4. **Create user documentation** with voice preview samples

## Benefits

✅ **Users can now**:
- Download high-quality custom voices with one command
- Switch to custom voices (jenny, kristin) just like standard voices
- Access individual speakers from multi-speaker models
- Choose from 19 total custom voices (3 models + 16 individual speakers)

✅ **System improvements**:
- Consistent voice switching experience across all voice types
- Automatic multi-speaker detection and configuration
- Clear error messages with available voice listings
- Support for future multi-speaker models
