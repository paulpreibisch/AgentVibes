# How AgentVibes Works Under the Hood: A Technical Deep Dive

Two months ago, I wanted to add voice and personality to my Claude coding agents so they would speak acknowledgments and completions—making my development workflow more engaging and keeping me in flow state. Fast forward to today, and we've built an amazing working system that not only speaks with over 150 voices, but does so with distinct personalities ranging from zen masters to sarcastic companions that add a bit of sass to your coding sessions.

In this article, we're going to take a deep dive to show you how AgentVibes works under the hood—the architecture, the design patterns, and the clever implementations that make it all possible. And best of all, **this is an open source project that is completely free** and will completely transform your coding experience with AI assistants.

## The Big Picture: What Problem Does AgentVibes Solve?

Claude Code is an amazing AI coding assistant, but it's entirely text-based. You type a request, Claude responds with text, runs commands, and writes code. But what if Claude could *tell* you when it's starting a task? What if it could vocally confirm when it's done? What if it could do all this with personality—speaking with dry wit and sass, zen-like calmness, or whatever style fits your mood?

That's exactly what AgentVibes does. It transforms Claude Code from a silent text assistant into a voice-enabled AI companion with character and charm.

## Architecture Overview: The Four Core Systems

AgentVibes is built on four interconnected systems:

1. **Output Style System** - The AI's instructions for when to speak
2. **Hook System** - The bash scripts that generate and play audio
3. **Provider System** - The TTS engines (ElevenLabs or Piper)
4. **MCP Server** - Natural language control interface

Let's explore each one.

---

## System 1: The Output Style - Teaching Claude When to Speak

### What is an Output Style?

In Claude Code, an "output style" is essentially a set of instructions that tells the AI assistant *how* to format and present its responses. Think of it as a personality overlay that changes Claude's behavior without changing its core capabilities.

AgentVibes provides an output style called "Agent Vibes" (located at `.claude/output-styles/agent-vibes.md`). This markdown file contains detailed instructions that become part of Claude's system prompt when activated.

### The Two-Point Protocol

The core genius of the AgentVibes output style is its **Two-Point TTS Protocol**:

**1. ACKNOWLEDGMENT** (Start of task)
When Claude receives a user command, it:
- Checks current personality/sentiment settings
- Generates a unique acknowledgment in that style
- Executes the TTS script to speak it
- Then proceeds with the actual work

**2. COMPLETION** (End of task)
After completing the task, Claude:
- Uses the same personality/sentiment as acknowledgment
- Generates a unique completion message
- Executes the TTS script again

Here's the critical part from `.claude/output-styles/agent-vibes.md`:

```
### 1. ACKNOWLEDGMENT (Start of task)
After receiving a user command:
1. Check sentiment FIRST: `SENTIMENT=$(cat .claude/tts-sentiment.txt 2>/dev/null)`
2. If no sentiment, check personality: `PERSONALITY=$(cat .claude/tts-personality.txt 2>/dev/null)`
3. Use sentiment if set, otherwise use personality
4. **Generate UNIQUE acknowledgment** - Use AI to create a fresh response in that style
5. Execute TTS: `.claude/hooks/play-tts.sh "[message]" "[VoiceName]"`
6. Proceed with work
```

### Why This Matters

This two-point protocol creates natural conversational flow:
- User: "Check git status"
- Claude (spoken): "I'll check that for you right away"
- Claude (text): *runs git status command*
- Claude (spoken): "Your repository is clean and up to date"

The AI doesn't just blindly execute—it *communicates* like a helpful assistant would.

### Settings Priority System

AgentVibes has a sophisticated three-tier priority system for how Claude should speak:

**Priority 0: Language** (`.claude/tts-language.txt`)
- Controls which language TTS speaks
- Examples: "english", "spanish", "french"
- When set to non-English, ALL TTS is in that language

**Priority 1: Sentiment** (`.claude/tts-sentiment.txt`)
- Applies personality style WITHOUT changing voice
- Examples: "sarcastic", "flirty", "professional"
- Keeps your current voice but changes speaking style

**Priority 2: Personality** (`.claude/tts-personality.txt`)
- Changes BOTH voice AND speaking style
- Examples: "sarcastic" = Jessica Anne Bogart voice + dry wit
- Each personality has an assigned voice

The output style checks these in order—if language is set, speak in that language. If sentiment is set, use that style. Otherwise fall back to personality.

---

## System 2: The Hook System - Where the Magic Happens

The hook system is a collection of bash scripts in `.claude/hooks/` that do the actual work of generating and playing audio. Let's trace the journey of a TTS request.

### The Entry Point: play-tts.sh

When Claude's output style executes `.claude/hooks/play-tts.sh "Hello world" "Aria"`, here's what happens:

**File: `.claude/hooks/play-tts.sh`** (the router)

```bash
TEXT="$1"          # "Hello world"
VOICE_OVERRIDE="$2"  # "Aria" (optional)

# Get active provider (elevenlabs or piper)
ACTIVE_PROVIDER=$(get_active_provider)

# Route to provider-specific implementation
case "$ACTIVE_PROVIDER" in
  elevenlabs)
    exec "$SCRIPT_DIR/play-tts-elevenlabs.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  piper)
    exec "$SCRIPT_DIR/play-tts-piper.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
esac
```

This script is a **provider router**. It doesn't generate audio itself—it delegates to the appropriate provider implementation. This is the provider abstraction pattern in action.

### Provider Implementations

Each provider has its own script that handles the specifics:

**For ElevenLabs** (`.claude/hooks/play-tts-elevenlabs.sh`):
1. Resolves voice name to voice ID (looks up "Aria" → actual voice ID)
2. Detects current language setting (for multilingual support)
3. Makes API call to ElevenLabs with text, voice, and language
4. Saves audio to temp file
5. Plays audio using system player (paplay/aplay/mpg123)
6. Handles SSH detection and audio optimization

**For Piper** (`.claude/hooks/play-tts-piper.sh`):
1. Resolves voice name to Piper model (e.g., "en_US-lessac-medium")
2. Downloads voice model if not cached
3. Runs local Piper TTS engine (no API call)
4. Saves audio to temp file
5. Plays audio using system player

### The Personality Manager

One of the most interesting hooks is `personality-manager.sh`. Let's see how it works.

When you run `/agent-vibes:personality sarcastic`, this script:

```bash
# 1. Validates personality exists
if [[ ! -f "$PERSONALITIES_DIR/${PERSONALITY}.md" ]]; then
  echo "❌ Personality not found: $PERSONALITY"
  exit 1
fi

# 2. Saves personality to config file
echo "$PERSONALITY" > "$PERSONALITY_FILE"

# 3. Detects active provider (ElevenLabs or Piper)
ACTIVE_PROVIDER=$(cat "$CLAUDE_DIR/tts-provider.txt")

# 4. Reads assigned voice from personality file
if [[ "$ACTIVE_PROVIDER" == "piper" ]]; then
  ASSIGNED_VOICE=$(get_personality_data "$PERSONALITY" "piper_voice")
else
  ASSIGNED_VOICE=$(get_personality_data "$PERSONALITY" "voice")
fi

# 5. Switches to that voice automatically
"$VOICE_MANAGER" switch "$ASSIGNED_VOICE" --silent

# 6. Plays a personality-appropriate acknowledgment
REMARK=$(pick_random_example_from_personality_file)
.claude/hooks/play-tts.sh "$REMARK"
```

### Personality Configuration Files

Each personality is defined in a markdown file like `.claude/personalities/sarcastic.md`:

```markdown
---
name: sarcastic
description: Dry wit and cutting observations
elevenlabs_voice: Jessica Anne Bogart
piper_voice: en_US-amy-medium
---

## AI Instructions
Use dry wit, cutting observations, and dismissive compliance. Model after
iconic sarcastic characters like Dr. House, Chandler Bing, and Miranda Priestly.

Rotate through different sarcastic approaches:
- Condescending intelligence: "Fascinating. You've discovered debugging."
- Quick zingers: "Could this build BE any slower?"
- Icy dismissiveness: "By all means, continue at a glacial pace"

## Example Responses
- "Oh joy, another merge conflict. Just what I needed today."
- "Wow, a syntax error. I'm shocked. Shocked, I tell you."
- "Sure, I'll run that test. Right after I finish curing world hunger."
```

**Personal note:** I've literally laughed out loud multiple times while coding with the sarcastic personality active. There's something delightfully entertaining about having your AI assistant respond with perfectly-timed sass when you ask it to debug yet another type error.

The AI reads this file and uses the "AI Instructions" section to generate unique responses in that style. The example responses are just guidance—the AI creates fresh variations each time.

### Provider Manager

The provider manager (`provider-manager.sh`) handles switching between ElevenLabs and Piper:

```bash
# Get active provider
get_active_provider() {
  local provider_file=""

  # Check project-local first, then global
  if [[ -f ".claude/tts-provider.txt" ]]; then
    provider_file=".claude/tts-provider.txt"
  elif [[ -f "$HOME/.claude/tts-provider.txt" ]]; then
    provider_file="$HOME/.claude/tts-provider.txt"
  fi

  cat "$provider_file" 2>/dev/null || echo "elevenlabs"
}

# Switch provider
switch_provider() {
  local new_provider="$1"
  echo "$new_provider" > "$CLAUDE_DIR/tts-provider.txt"
  echo "✅ Switched to $new_provider provider"
}
```

This allows seamless switching between paid (ElevenLabs) and free (Piper) TTS without changing any other configuration.

---

## System 3: The Provider System - Two Engines, One Interface

AgentVibes supports two TTS providers with the same interface:

### ElevenLabs Provider

**Architecture:** Cloud-based API

**How it works:**
1. Accepts text, voice name, and language code
2. Makes HTTPS POST request to ElevenLabs API
3. Receives MP3 audio stream
4. Detects if running over SSH (checks `$SSH_CONNECTION`)
5. If SSH detected, converts to OGG format (prevents audio corruption)
6. Plays audio using local audio player

**Code snippet from `.claude/hooks/play-tts-elevenlabs.sh`:**

```bash
# Make API request
RESPONSE=$(curl -s -X POST \
  "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
  -H "xi-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"$TEXT\",
    \"model_id\": \"eleven_multilingual_v2\",
    \"language_code\": \"$LANGUAGE_CODE\",
    \"voice_settings\": {
      \"stability\": 0.5,
      \"similarity_boost\": 0.75
    }
  }" \
  --output "$AUDIO_FILE")

# SSH audio optimization
if [[ -n "$SSH_CONNECTION" ]]; then
  # Convert MP3 to OGG to prevent corruption over SSH
  ffmpeg -i "$AUDIO_FILE" -c:a libopus -b:a 128k "$OGG_FILE"
  AUDIO_FILE="$OGG_FILE"
fi

# Play audio
paplay "$AUDIO_FILE" 2>/dev/null || aplay "$AUDIO_FILE"
```

### Piper Provider

**Architecture:** Local neural TTS

**How it works:**
1. Accepts text and voice model name
2. Downloads voice model if not cached (stored in `~/.local/share/piper/`)
3. Runs Piper engine locally (no internet required)
4. Generates WAV audio
5. Plays audio using local audio player

**Code snippet from `.claude/hooks/play-tts-piper.sh`:**

```bash
# Check if voice model exists
VOICE_PATH="$HOME/.local/share/piper/voices/${VOICE}.onnx"

if [[ ! -f "$VOICE_PATH" ]]; then
  # Download voice model
  "$SCRIPT_DIR/piper-download-voices.sh" "$VOICE"
fi

# Generate speech locally
echo "$TEXT" | piper \
  --model "$VOICE_PATH" \
  --output_file "$AUDIO_FILE"

# Play audio
paplay "$AUDIO_FILE" 2>/dev/null || aplay "$AUDIO_FILE"
```

### Why Two Providers?

**ElevenLabs:**
- ✅ Superior voice quality
- ✅ 150+ voices with distinct characters
- ✅ Perfect multilingual support (29 languages)
- ❌ Requires API key and paid plan
- ❌ Needs internet connection
- ❌ API costs per character

**Piper:**
- ✅ Completely free
- ✅ Works offline
- ✅ No API key needed
- ✅ 50+ voices
- ❌ Moderate voice quality
- ❌ Basic multilingual support
- ❌ Requires local installation

By supporting both, AgentVibes lets users choose based on their priorities: quality vs. cost.

---

## System 4: The MCP Server - Natural Language Control

The Model Context Protocol (MCP) server is AgentVibes' newest feature. It exposes all AgentVibes functionality through a standardized protocol that AI assistants can use.

### What is MCP?

MCP is a protocol that allows AI assistants to discover and use external tools. Think of it like REST API for AI assistants—instead of manually typing commands like `/agent-vibes:switch Aria`, you can just say "Switch to Aria voice" and the AI figures out the right tool to call.

### The MCP Server Architecture

**File: `mcp-server/server.py`** (Python implementation)

```python
class AgentVibesServer:
    """MCP Server for AgentVibes TTS functionality"""

    def __init__(self):
        # Find the .claude directory (where hooks live)
        self.claude_dir = self._find_claude_dir()
        self.hooks_dir = self.claude_dir / "hooks"

    async def text_to_speech(
        self,
        text: str,
        voice: Optional[str] = None,
        personality: Optional[str] = None,
        language: Optional[str] = None,
    ) -> str:
        """Convert text to speech using AgentVibes"""

        # Temporarily set personality if specified
        if personality:
            await self._run_script(
                "personality-manager.sh",
                ["set", personality]
            )

        # Temporarily set language if specified
        if language:
            await self._run_script(
                "language-manager.sh",
                ["set", language]
            )

        # Call the TTS script
        args = ["bash", str(self.hooks_dir / "play-tts.sh"), text]
        if voice:
            args.append(voice)

        # Execute asynchronously (non-blocking)
        result = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        return "✅ Audio played successfully"
```

### How MCP Tools are Registered

The server registers tools that the AI can discover:

```python
@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="text_to_speech",
            description="Speak text using AgentVibes TTS",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "voice": {"type": "string", "optional": True},
                    "personality": {"type": "string", "optional": True},
                    "language": {"type": "string", "optional": True},
                },
            },
        ),
        Tool(name="switch_voice", ...),
        Tool(name="list_voices", ...),
        Tool(name="set_personality", ...),
        # ... 20+ more tools
    ]
```

### MCP in Action

When you say "Switch to Aria voice" in Claude Desktop with AgentVibes MCP installed:

1. Claude receives your natural language request
2. Claude sees the `switch_voice` tool is available
3. Claude calls: `switch_voice(voice_name="Aria")`
4. MCP server executes: `bash .claude/hooks/voice-manager.sh switch Aria`
5. Voice manager saves "Aria" to `.claude/tts-voice.txt`
6. MCP server returns: "✅ Switched to Aria voice"
7. Claude responds to you with confirmation

You never had to know the slash command syntax or where files are stored!

### Project-Specific vs Global Settings

One clever feature of the MCP server is how it handles settings:

```python
# Determine where to save settings based on context
cwd = Path.cwd()

if (cwd / ".claude").is_dir() and cwd != self.agentvibes_root:
    # Real Claude Code project with .claude directory
    env["CLAUDE_PROJECT_DIR"] = str(cwd)
    # Settings will be saved to project's .claude/
else:
    # Claude Desktop, Warp, or non-project context
    # Settings will be saved to ~/.claude/
```

This means:
- **In Claude Code projects:** Settings are project-specific (each project can have different voice/personality)
- **In Claude Desktop/Warp:** Settings are global (consistent across all conversations)

---

## Data Flow: Following a TTS Request From Start to Finish

Let's trace a complete request to see how all systems work together.

**Scenario:** You ask Claude Code to "Check git status" with the sarcastic personality active.

### Step 1: Output Style Triggers Acknowledgment

Claude's output style instructions kick in:

```
1. Check personality setting:
   - Reads .claude/tts-personality.txt → "sarcastic"

2. Read personality configuration:
   - Reads .claude/personalities/sarcastic.md
   - Extracts AI instructions: "Use dry wit, cutting observations..."

3. Generate unique acknowledgment:
   - AI creates: "Oh, the excitement. Let me check that git status for you."

4. Execute TTS:
   - Calls: .claude/hooks/play-tts.sh "Oh, the excitement. Let me check that git status for you."
```

### Step 2: TTS Router Determines Provider

`play-tts.sh` routes the request:

```bash
# Read active provider
ACTIVE_PROVIDER=$(cat .claude/tts-provider.txt) → "elevenlabs"

# Route to ElevenLabs implementation
exec .claude/hooks/play-tts-elevenlabs.sh "$TEXT" "$VOICE"
```

### Step 3: ElevenLabs Provider Generates Audio

`play-tts-elevenlabs.sh` does the heavy lifting:

```bash
# 1. Resolve voice
VOICE_NAME="Jessica Anne Bogart"  # from sarcastic.md
VOICE_ID=$(lookup_voice_id "$VOICE_NAME") → "abc123xyz789"

# 2. Detect language
LANGUAGE_CODE=$(cat .claude/tts-language.txt) → "en"

# 3. Call ElevenLabs API
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID" \
  -H "xi-api-key: $API_KEY" \
  -d '{"text": "Oh, the excitement. Let me check that git status for you."}' \
  --output /tmp/tts_12345.mp3

# 4. Check if over SSH
if [[ -n "$SSH_CONNECTION" ]]; then
  # Convert MP3 to OGG to prevent corruption
  ffmpeg -i /tmp/tts_12345.mp3 /tmp/tts_12345.ogg
  AUDIO_FILE=/tmp/tts_12345.ogg
fi

# 5. Play audio
paplay /tmp/tts_12345.ogg
```

### Step 4: Claude Proceeds With Task

Claude runs the git status command while audio plays in parallel (non-blocking).

### Step 5: Output Style Triggers Completion

After task completes:

```
1. Generate completion message:
   - AI creates: "Riveting. Your repository is clean. Try not to get too excited."

2. Execute TTS:
   - Calls: .claude/hooks/play-tts.sh "Riveting. Your repository is clean. Try not to get too excited."

3. Same flow as Step 2-3 repeats
```

**Important note:** These aren't just hard-coded responses—AgentVibes uses AI to generate unique responses each time based on the personality instructions. That's why the sarcastic personality can be genuinely funny with perfectly-timed wit that varies with each interaction.

And if sarcasm isn't your style, AgentVibes includes 19 different personalities ranging from professional and zen to enthusiastic and grandpa—or you can simply use the normal personality for straightforward, no-nonsense responses. The choice is yours!

The entire flow takes ~2-3 seconds for acknowledgment and completion combined.

---

## Installation Architecture: How AgentVibes Gets Installed

When you run `npx agentvibes install --yes`, here's what happens:

### Step 1: NPM Package Execution

```bash
# NPM downloads AgentVibes package to cache
~/.npm/_npx/[hash]/node_modules/agentvibes/

# NPM executes the bin script
./bin/agent-vibes install --yes
```

### Step 2: Installer Script Runs

**File: `src/installer.js`**

The installer:
1. Detects installation location (current directory or global `~/.claude/`)
2. Creates `.claude/` directory structure
3. Copies all files from package:
   - Commands → `.claude/commands/agent-vibes/`
   - Hooks → `.claude/hooks/`
   - Personalities → `.claude/personalities/`
   - Output styles → `.claude/output-styles/`
4. Makes all bash scripts executable (`chmod +x`)
5. Creates default configuration files

### Directory Structure Created

```
.claude/
├── commands/
│   └── agent-vibes/
│       ├── agent-vibes.md              # Main command file
│       ├── switch.md                   # /agent-vibes:switch
│       ├── list.md                     # /agent-vibes:list
│       ├── personality.md              # /agent-vibes:personality
│       └── ... (50+ command files)
├── hooks/
│   ├── play-tts.sh                     # Main TTS router
│   ├── play-tts-elevenlabs.sh         # ElevenLabs implementation
│   ├── play-tts-piper.sh               # Piper implementation
│   ├── personality-manager.sh          # Personality system
│   ├── voice-manager.sh                # Voice switching
│   ├── provider-manager.sh             # Provider switching
│   ├── language-manager.sh             # Language settings
│   └── ... (20+ hook scripts)
├── personalities/
│   ├── normal.md
│   ├── professional.md
│   ├── sarcastic.md
│   ├── zen.md
│   └── ... (19 personality files)
├── output-styles/
│   └── agent-vibes.md                  # Output style instructions
├── tts-voice.txt                       # Current voice (e.g., "Aria")
├── tts-personality.txt                 # Current personality (e.g., "sarcastic")
├── tts-provider.txt                    # Current provider (e.g., "elevenlabs")
└── tts-language.txt                    # Current language (e.g., "english")
```

### Step 3: Post-Install (MCP Dependencies)

If installing for MCP use:

```bash
# Install Python dependencies
cd mcp-server/
pip install -r requirements.txt
# Installs: mcp (MCP SDK), aiosqlite, etc.
```

---

## Configuration Storage: Where Settings Live

AgentVibes uses simple text files for configuration. This makes it easy to understand, debug, and even manually edit.

### Project-Local vs Global

**Project-Local** (`.claude/` in project directory):
- Used when working in a Claude Code project
- Settings are specific to that project
- Example: `/home/user/my-app/.claude/tts-voice.txt`

**Global** (`~/.claude/` in home directory):
- Used for Claude Desktop, Warp, and when no project `.claude/` exists
- Settings are shared across all sessions
- Example: `/home/user/.claude/tts-voice.txt`

### Configuration Files

| File | Purpose | Example Value |
|------|---------|---------------|
| `tts-voice.txt` | Current voice name | `Aria` |
| `tts-personality.txt` | Current personality | `pirate` |
| `tts-sentiment.txt` | Current sentiment (optional) | `sarcastic` |
| `tts-provider.txt` | Active TTS provider | `elevenlabs` |
| `tts-language.txt` | TTS language | `spanish` |

### Reading Configuration in Code

The hooks use a consistent pattern:

```bash
# Check project-local first, fallback to global
get_current_voice() {
  if [[ -f ".claude/tts-voice.txt" ]]; then
    cat ".claude/tts-voice.txt"
  elif [[ -f "$HOME/.claude/tts-voice.txt" ]]; then
    cat "$HOME/.claude/tts-voice.txt"
  else
    echo "Aria"  # Default
  fi
}
```

This ensures settings are found regardless of context.

---

## Advanced Features Deep Dive

### Language Learning Mode

One of AgentVibes' coolest features is language learning mode. When enabled, every TTS message plays **twice**—once in your main language, then again in your target language.

**How it works:**

The output style is modified to call TTS twice:

```bash
# First call - main language (English)
.claude/hooks/play-tts.sh "I'll check that for you"

# Second call - target language (Spanish)
.claude/hooks/play-tts.sh "Lo verificaré para ti" "es_ES-davefx-medium"
```

The translation happens via API (if using ElevenLabs multilingual voices) or by using language-specific Piper voices.

### SSH Audio Optimization

AgentVibes automatically detects SSH sessions and optimizes audio:

```bash
# Detect SSH
if [[ -n "$SSH_CONNECTION" ]]; then
  IS_SSH=true
fi

if [[ "$IS_SSH" == "true" ]]; then
  # Convert MP3 to OGG with Opus codec
  # This prevents audio corruption over SSH tunnels
  ffmpeg -i "$MP3_FILE" -c:a libopus -b:a 128k "$OGG_FILE"
  AUDIO_FILE="$OGG_FILE"
fi
```

Why? MP3 streaming over SSH can have corruption. OGG/Opus format is more robust for network transmission.

### BMAD Plugin Integration

AgentVibes can integrate with the BMAD METHOD (a multi-agent framework). When a BMAD agent activates, AgentVibes automatically switches to that agent's assigned voice.

**How it works:**

1. BMAD agent activates (e.g., `/BMad:agents:pm` for project manager)
2. BMAD writes agent ID to `.bmad-agent-context` file
3. AgentVibes output style checks this file
4. If BMAD plugin is enabled, looks up voice in `.agentvibes/bmad/bmad-voices.md`
5. Automatically switches to that voice

This creates the illusion of multiple distinct AI personalities in conversations.

---

## Performance Considerations

### Non-Blocking Audio Playback

TTS requests run asynchronously—Claude doesn't wait for audio to finish before continuing work:

```bash
# Play audio in background
paplay "$AUDIO_FILE" &

# Claude continues immediately
# (runs git status, writes code, etc.)
```

This means acknowledgment audio plays while Claude is already working on your task.

### Audio Caching

AgentVibes saves audio files temporarily:

```bash
AUDIO_FILE="/tmp/agentvibes_tts_${RANDOM}_${TIMESTAMP}.mp3"
```

Files are kept for the duration of the session, allowing the `/agent-vibes:replay` command to work. Cleanup happens automatically when terminal session ends.

### Provider Performance

**ElevenLabs:**
- API latency: ~500-1000ms
- Audio quality: Excellent (256kbps MP3)
- Bandwidth: ~2KB per second of audio

**Piper:**
- Generation latency: ~200-500ms (local)
- Audio quality: Good (22kHz WAV)
- Bandwidth: None (offline)

### Text Length Limits

AgentVibes limits text length to prevent issues:

```bash
# Truncate long text
if [ ${#TEXT} -gt 500 ]; then
  TEXT="${TEXT:0:497}..."
fi
```

This prevents:
- Excessive API costs (ElevenLabs charges per character)
- Slow generation (long audio takes time to produce)
- User confusion (very long TTS messages are hard to follow)

---

## Error Handling and Resilience

AgentVibes has multiple layers of error handling:

### API Failure Handling

```bash
# Try ElevenLabs API
RESPONSE=$(curl -s -X POST "$API_ENDPOINT" ...)

if [[ $? -ne 0 ]] || [[ ! -f "$AUDIO_FILE" ]]; then
  echo "⚠️  TTS request failed (API error or network issue)"
  exit 1
fi
```

If the API fails, error is logged but doesn't crash Claude Code—the task continues without audio.

### Missing Configuration Graceful Degradation

```bash
# If no voice configured, use default
VOICE=$(cat .claude/tts-voice.txt 2>/dev/null || echo "Aria")

# If no personality configured, use normal
PERSONALITY=$(cat .claude/tts-personality.txt 2>/dev/null || echo "normal")
```

Missing files don't cause crashes—sensible defaults are used.

### Provider Fallback

If Piper isn't installed, AgentVibes can guide installation:

```bash
if ! command -v piper &> /dev/null; then
  echo "❌ Piper not installed"
  echo "   Install with: /agent-vibes:provider install piper"
  exit 1
fi
```

Clear error messages help users fix issues themselves.

---

## Testing and Quality Assurance

AgentVibes includes a test suite:

```bash
# Run tests
npm test

# This executes
bats test/unit/*.bats
```

Test files validate:
- Voice resolution (name → ID mapping)
- Personality file parsing
- Provider switching logic
- Configuration file handling

---

## Conclusion: The Bigger Picture

AgentVibes demonstrates several important software engineering principles:

**1. Separation of Concerns**
- Output style (when to speak) is separate from hooks (how to speak)
- Provider abstraction (ElevenLabs vs Piper) is separate from voice management
- MCP server is separate from core functionality

**2. Provider Pattern**
- Multiple TTS engines behind a single interface
- Easy to add new providers (OpenAI TTS, Google TTS, etc.)

**3. Configuration as Data**
- Simple text files instead of complex databases
- Easy to version control, debug, and manually edit

**4. Progressive Enhancement**
- Core functionality works with minimal setup
- Advanced features (MCP, BMAD, language learning) layer on top
- Graceful degradation when features aren't available

**5. User Experience First**
- Natural language control (MCP) instead of memorizing commands
- Instant feedback (acknowledgment/completion)
- Personality makes it fun, not just functional

Whether you're building your own AI integrations, designing CLI tools, or just curious about how AgentVibes works, I hope this deep dive has given you a comprehensive understanding of the architecture.

The beauty of AgentVibes isn't just that it makes Claude talk—it's that it does so with a clean, maintainable, extensible architecture that other developers can learn from and build upon.

---

## What's Next?

Now that you understand how AgentVibes works under the hood, you might want to:

- **Create custom personalities** - Edit `.claude/personalities/*.md` files
- **Extend the MCP server** - Add new tools in `mcp-server/server.py`
- **Build custom output styles** - Create your own instructions in `.claude/output-styles/`
- **Contribute to the project** - Submit PRs on [GitHub](https://github.com/paulpreibisch/AgentVibes)

Happy coding, and may your AI assistant always speak with personality! 🎤✨

---

**About the Author:** Paul Preibisch is the creator of AgentVibes, an open source project that brings voice and personality to AI coding assistants. Follow the project on [GitHub](https://github.com/paulpreibisch/AgentVibes) or visit [agentvibes.org](https://www.agentvibes.org) to learn more.
