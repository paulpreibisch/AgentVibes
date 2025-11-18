# TTS Queue System for Party Mode

## Overview

The TTS Queue System enables BMAD party mode agents to speak sequentially without blocking Claude Code's response generation. This provides the best of both worlds:

- ✅ **Non-blocking**: Claude Code continues generating agent responses immediately
- ✅ **Sequential playback**: Agents speak one at a time in order, with correct voices
- ✅ **No audio overlap**: The queue ensures voices don't talk over each other

## How It Works

### Architecture

```
bmad-speak.sh → tts-queue.sh → Queue Directory → tts-queue-worker.sh → play-tts.sh → Audio
     ↓               ↓                                       ↓
  Returns        Returns                              Processes queue
immediately    immediately                            sequentially
```

### Components

1. **`tts-queue.sh`** - Queue manager (adds requests, shows status, clears queue)
2. **`tts-queue-worker.sh`** - Background worker process (plays audio sequentially)
3. **`bmad-speak.sh`** - Updated to use queue system with `&` for non-blocking
4. **Queue directory**: `/tmp/agentvibes-tts-queue/` - Stores pending TTS requests

### Flow

1. Party mode agent generates response
2. `bmad-speak.sh` adds TTS request to queue and returns immediately (`&`)
3. Queue worker automatically starts if needed
4. Worker processes queue items sequentially (oldest first)
5. Each audio file plays to completion before next one starts
6. Worker auto-exits after 5 seconds of idle time

## Usage

### Normal Usage (Automatic)

Party mode automatically uses the queue system. No manual intervention needed.

### Manual Queue Management

```bash
# Check queue status
bash .claude/hooks/tts-queue.sh status

# Clear all pending TTS (emergency stop)
bash .claude/hooks/tts-queue.sh clear

# Manually add to queue
bash .claude/hooks/tts-queue.sh add "Hello world" "en_US-ryan-high"
```

## Performance Benefits

### Before (Sequential Blocking):
```
Agent 1 text output → [WAIT 3s for audio] → Agent 2 text → [WAIT 3s] → Agent 3 text
Total time: ~9+ seconds
```

### After (Queue System):
```
Agent 1 text → Agent 2 text → Agent 3 text (all immediate)
                         ↓
            [Audio plays sequentially in background]
Total text output time: <1 second
Total audio time: ~9 seconds (plays while Claude continues working)
```

## Technical Details

### Queue File Format

Each queue item is a timestamped file containing escaped bash variables:

```bash
TEXT='First\ message\ from\ John'
VOICE='en_US-ryan-high'
```

### Worker Lifecycle

- **Start**: Automatically launched when first item added to empty queue
- **Processing**: Continues while queue has items
- **Idle timeout**: Exits after 5 seconds with no new items
- **Auto-restart**: Next queue addition spawns new worker

### Thread Safety

- Queue items use nanosecond timestamps for uniqueness
- Worker processes oldest items first (sorted by filename)
- Audio lock mechanism in `play-tts.sh` prevents actual audio overlap
- Worker PID tracked in `/tmp/agentvibes-tts-queue/worker.pid`

## Troubleshooting

### Queue stuck or voices not playing

```bash
# Check status
bash .claude/hooks/tts-queue.sh status

# Clear queue and restart
bash .claude/hooks/tts-queue.sh clear
```

### Worker not starting

Check for errors in the worker script:
```bash
bash .claude/hooks/tts-queue-worker.sh
```

### Audio still overlapping

Verify the lock file mechanism is working:
```bash
ls -la /tmp/agentvibes-audio.lock
```

## Files Modified

- `.claude/hooks/bmad-speak.sh` - Now uses queue system with `&` for non-blocking
- `.claude/hooks/tts-queue.sh` - New queue manager (added)
- `.claude/hooks/tts-queue-worker.sh` - New background worker (added)

## Compatibility

- Works with both Piper and ElevenLabs TTS providers
- Compatible with all existing BMAD voice mappings
- No changes needed to party mode workflow instructions
