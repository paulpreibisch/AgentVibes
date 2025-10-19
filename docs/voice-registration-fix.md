# Voice Registration Fix - Extra Piper Voices

## Problems Identified

### 1. **Download Issues**
- The `tracy.onnx` download only got 15 bytes (redirect/error page)
- **Root Cause**: The HuggingFace file is actually named `16Speakers.onnx`, not `tracy.onnx`
- **Fix**: Updated download script to use correct filename `16Speakers.onnx`

### 2. **Voice Registration Issues**
When users download custom Piper voices (jenny, kristin, 16Speakers), they cannot switch to them because:

**Problem**: The voice-manager.sh uses two different lookup methods:
1. **ElevenLabs voices**: Uses `voices-config.sh` associative array
2. **Piper voices**: Scans `.onnx` files in the voice storage directory

**Current voice-manager.sh logic (line 265-269)**:
```bash
# If using Piper and voice name looks like a Piper model (contains underscore and dash)
# then skip ElevenLabs voice validation
if [[ "$ACTIVE_PROVIDER" == "piper" ]] && [[ "$VOICE_NAME" == *"_"*"-"* ]]; then
  # This is a Piper model name, use it directly
  FOUND="$VOICE_NAME"
```

**Issue**: Custom voice names like `jenny`, `kristin`, and `16Speakers` DON'T contain underscore and dash, so they fail the Piper detection and fall through to ElevenLabs lookup, which fails.

**Why it fails**:
- `jenny` → No underscore/dash → Falls to ElevenLabs lookup → Not found → Error
- `kristin` → No underscore/dash → Falls to ElevenLabs lookup → Not found → Error
- `16Speakers` → No underscore/dash → Falls to ElevenLabs lookup → Not found → Error

**Why standard Piper voices work**:
- `en_US-lessac-medium` → Contains `_` and `-` → Passes Piper check → Works!
- `en_GB-alan-medium` → Contains `_` and `-` → Passes Piper check → Works!

### 3. **Multi-Speaker Voice Support (16Speakers)**

The `16Speakers.onnx` is a special multi-speaker model containing 16 different voices:

```json
{
  "speaker_id_map": {
    "Cori_Samuel": 0,
    "Kara_Shallenberg": 1,
    "Kristin_Hughes": 2,
    "Maria_Kasper": 3,
    "Mike_Pelton": 4,
    "Mark_Nelson": 5,
    "Michael_Scherer": 6,
    "James_K_White": 7,
    "Rose_Ibex": 8,
    "progressingamerica": 9,
    "Steve_C": 10,
    "Owlivia": 11,
    "Paul_Hampton": 12,
    "Jennifer_Dorr": 13,
    "Emily_Cripps": 14,
    "Martin_Clifton": 15
  }
}
```

**Usage**: Users should be able to say:
- `/agent-vibes:switch Cori_Samuel` → Uses `16Speakers.onnx` with speaker ID 0
- `/agent-vibes:switch Rose_Ibex` → Uses `16Speakers.onnx` with speaker ID 8

**Problem**: Currently no system to:
1. Parse multi-speaker voice names
2. Pass speaker ID to Piper TTS
3. Register individual speaker names from multi-speaker models

## Solution Design

### Phase 1: Fix Basic Custom Voice Registration

**Approach**: Enhance `voice-manager.sh` to check for custom Piper voices by scanning the voice directory.

**Modified logic**:
```bash
# 1. Check if it's a number (for ElevenLabs numbered selection)
if [[ "$VOICE_NAME" =~ ^[0-9]+$ ]]; then
  # ... existing numbered selection code ...

# 2. NEW: Check if it's a Piper voice (scan voice directory)
elif [[ "$ACTIVE_PROVIDER" == "piper" ]]; then
  source "$SCRIPT_DIR/piper-voice-manager.sh"
  VOICE_DIR=$(get_voice_storage_dir)

  # Check if voice file exists (case-insensitive)
  FOUND=""
  for onnx_file in "$VOICE_DIR"/*.onnx; do
    if [[ -f "$onnx_file" ]]; then
      voice=$(basename "$onnx_file" .onnx)
      if [[ "${voice,,}" == "${VOICE_NAME,,}" ]]; then
        FOUND="$voice"
        break
      fi
    fi
  done

  if [[ -z "$FOUND" ]]; then
    echo "❌ Piper voice not found: $VOICE_NAME"
    echo ""
    echo "Available Piper voices:"
    for onnx_file in "$VOICE_DIR"/*.onnx; do
      [[ -f "$onnx_file" ]] && echo "  - $(basename "$onnx_file" .onnx)"
    done | sort
    exit 1
  fi

# 3. Fall back to ElevenLabs lookup
else
  # ... existing ElevenLabs lookup code ...
fi
```

### Phase 2: Multi-Speaker Support

**1. Create Multi-Speaker Registry**

New file: `.claude/hooks/piper-multispeaker-registry.sh`

```bash
# Registry of multi-speaker models and their speaker names
# Format: "SpeakerName:model_file:speaker_id"
MULTISPEAKER_VOICES=(
  "Cori_Samuel:16Speakers:0"
  "Kara_Shallenberg:16Speakers:1"
  "Kristin_Hughes:16Speakers:2"
  "Maria_Kasper:16Speakers:3"
  "Mike_Pelton:16Speakers:4"
  "Mark_Nelson:16Speakers:5"
  "Michael_Scherer:16Speakers:6"
  "James_K_White:16Speakers:7"
  "Rose_Ibex:16Speakers:8"
  "progressingamerica:16Speakers:9"
  "Steve_C:16Speakers:10"
  "Owlivia:16Speakers:11"
  "Paul_Hampton:16Speakers:12"
  "Jennifer_Dorr:16Speakers:13"
  "Emily_Cripps:16Speakers:14"
  "Martin_Clifton:16Speakers:15"
)

# Get model and speaker ID for a speaker name
get_multispeaker_info() {
  local speaker_name="$1"
  for entry in "${MULTISPEAKER_VOICES[@]}"; do
    name="${entry%%:*}"
    rest="${entry#*:}"
    model="${rest%%:*}"
    speaker_id="${rest#*:}"

    if [[ "${name,,}" == "${speaker_name,,}" ]]; then
      echo "$model:$speaker_id"
      return 0
    fi
  done
  return 1
}
```

**2. Update voice-manager.sh**

```bash
# After checking standard Piper voices, check multi-speaker registry
if [[ -z "$FOUND" ]] && [[ "$ACTIVE_PROVIDER" == "piper" ]]; then
  source "$SCRIPT_DIR/piper-multispeaker-registry.sh"

  MULTISPEAKER_INFO=$(get_multispeaker_info "$VOICE_NAME")
  if [[ -n "$MULTISPEAKER_INFO" ]]; then
    MODEL="${MULTISPEAKER_INFO%%:*}"
    SPEAKER_ID="${MULTISPEAKER_INFO#*:}"

    # Store as "SpeakerName" in tts-voice.txt
    # Store model and speaker ID separately for play-tts-piper.sh to use
    echo "$VOICE_NAME" > "$VOICE_FILE"
    echo "$MODEL" > "$CLAUDE_DIR/tts-piper-model.txt"
    echo "$SPEAKER_ID" > "$CLAUDE_DIR/tts-piper-speaker-id.txt"

    echo "✅ Multi-speaker voice switched to: $VOICE_NAME"
    echo "🎤 Model: $MODEL (Speaker ID: $SPEAKER_ID)"
    exit 0
  fi
fi
```

**3. Update play-tts-piper.sh**

```bash
# Check if this is a multi-speaker voice
SPEAKER_ID_FILE="$CLAUDE_DIR/tts-piper-speaker-id.txt"
MODEL_FILE="$CLAUDE_DIR/tts-piper-model.txt"

if [[ -f "$SPEAKER_ID_FILE" ]] && [[ -f "$MODEL_FILE" ]]; then
  # Use multi-speaker model
  PIPER_MODEL=$(cat "$MODEL_FILE")
  SPEAKER_ID=$(cat "$SPEAKER_ID_FILE")

  # Get model path
  VOICE_PATH=$(get_voice_path "$PIPER_MODEL")

  # Pass speaker ID to Piper
  echo "$TEXT" | piper \
    --model "$VOICE_PATH" \
    --speaker "$SPEAKER_ID" \
    --output_file "$OUTPUT_FILE" 2>&1
else
  # Standard single-speaker voice
  # ... existing code ...
fi
```

## Implementation Plan

### Step 1: Fix download script filename ✅
- [x] Change `tracy.onnx` to `16Speakers.onnx` in download-extra-voices.sh

### Step 2: Fix basic custom voice switching
- [ ] Update `voice-manager.sh` switch logic to scan voice directory for Piper voices
- [ ] Test switching to `jenny`, `kristin`, `16Speakers`

### Step 3: Implement multi-speaker support
- [ ] Create `piper-multispeaker-registry.sh`
- [ ] Update `voice-manager.sh` to handle multi-speaker lookups
- [ ] Update `play-tts-piper.sh` to pass speaker ID to Piper
- [ ] Test switching to individual speakers (e.g., `Cori_Samuel`, `Rose_Ibex`)

### Step 4: Update voice listing
- [ ] Make `/agent-vibes:list` show all custom voices (jenny, kristin, 16 speaker names)
- [ ] Organize output: "Standard Voices", "Custom Voices", "Multi-Speaker Voices"

### Step 5: MCP Integration
- [ ] Update MCP server to expose multi-speaker voice info
- [ ] Add `list_multispeaker_voices()` method to show available speakers

## Testing Checklist

- [ ] Download extra voices: `mcp__agentvibes__download_extra_voices()`
- [ ] Switch to jenny: `/agent-vibes:switch jenny`
- [ ] Switch to kristin: `/agent-vibes:switch kristin`
- [ ] Switch to 16Speakers: `/agent-vibes:switch 16Speakers`
- [ ] Switch to Cori_Samuel: `/agent-vibes:switch Cori_Samuel`
- [ ] Switch to Rose_Ibex: `/agent-vibes:switch Rose_Ibex`
- [ ] List all voices: `/agent-vibes:list` (should show all custom + multi-speaker)
- [ ] Play TTS with each voice to verify audio works

## Future Enhancements

1. **Auto-registration**: When downloading 16Speakers, auto-register all 16 speaker names
2. **Voice preview**: Add preview support for multi-speaker voices
3. **Voice metadata**: Store speaker descriptions (gender, accent, etc.) in registry
4. **Dynamic discovery**: Auto-scan .onnx.json files for speaker_id_map and register dynamically
