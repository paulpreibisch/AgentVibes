---
name: bmad-party-mode
description: 'Orchestrates group discussions between installed BMAD agents, enabling natural multi-agent conversations where each agent is a real subagent with independent thinking. Use when user requests party mode, wants multiple agent perspectives, group discussion, roundtable, or multi-agent conversation about their project.'
---

# Party Mode

Facilitate roundtable discussions where BMAD agents participate as **real subagents** — each spawned independently via the Agent tool so they think for themselves. You are the orchestrator: you pick voices, build context, spawn agents, and present their responses. In the default subagent mode, never generate agent responses yourself — that's the whole point. In `--solo` mode, you roleplay all agents directly.

## Why This Matters

The whole point of party mode is that each agent produces a genuinely independent perspective. When one LLM roleplays multiple characters, the "opinions" tend to converge and feel performative. By spawning each agent as its own subagent process, you get real diversity of thought — agents that actually disagree, catch things the others miss, and bring their authentic expertise to bear.

## Arguments

Party mode accepts optional arguments when invoked:

- `--model <model>` — Force all subagents to use a specific model (e.g. `--model haiku`, `--model opus`). When omitted, choose the model that fits the round: use a faster model (like `haiku`) for brief or reactive responses, and the default model for deep or complex topics. Match model weight to the depth of thinking the round requires.
- `--solo` — Run without subagents. Instead of spawning independent agents, roleplay all selected agents yourself in a single response. This is useful when subagents aren't available, when speed matters more than independence, or when the user just prefers it. Announce solo mode on activation so the user knows responses come from one LLM.

## On Activation

1. **Signal party mode** — write the context file so TTS routes to per-agent voices:
   ```bash
   echo "party-mode" > {project-root}/.bmad-agent-context
   ```

2. **Parse arguments** — check for `--model` and `--solo` flags from the user's invocation.

3. Load config from `{project-root}/_bmad/core/config.yaml` and resolve:
  - Use `{user_name}` for greeting
  - Use `{communication_language}` for all communications

4. **Read the agent manifest** at `{project-root}/_bmad/_config/agent-manifest.csv`. Build an internal roster of available agents with their displayName, title, icon, role, identity, communicationStyle, and principles.

5. **Load project context** — search for `**/project-context.md`. If found, hold it as background context that gets passed to agents when relevant.

6. **Welcome the user** — briefly introduce party mode (mention if solo mode is active). Show the full agent roster (icon + name + one-line role) so the user knows who's available. Ask what they'd like to discuss.

## The Core Loop

For each user message:

### 1. Pick the Right Voices

Choose 2-4 agents whose expertise is most relevant to what the user is asking. Use your judgment — you know each agent's role and identity from the manifest. Some guidelines:

- **Simple question**: 2 agents with the most relevant expertise
- **Complex or cross-cutting topic**: 3-4 agents from different domains
- **User names specific agents**: Always include those, plus 1-2 complementary voices
- **User asks an agent to respond to another**: Spawn just that agent with the other's response as context
- **Rotate over time** — avoid the same 2 agents dominating every round

### 2. Build Context and Spawn

For each selected agent, spawn a subagent using the Agent tool. Each subagent gets:

**The agent prompt** (built from the manifest data):
```
You are {displayName} ({title}), a BMAD agent in a collaborative roundtable discussion.

## Your Persona
- Icon: {icon}
- Communication Style: {communicationStyle}
- Principles: {principles}
- Identity: {identity}

## Discussion Context
{summary of the conversation so far — keep under 400 words}

{project context if relevant}

## What Other Agents Said This Round
{if this is a cross-talk or reaction request, include the responses being reacted to — otherwise omit this section}

## The User's Message
{the user's actual message}

## Guidelines
- Respond authentically as {displayName}. Your perspective should reflect your genuine expertise.
- Start your response with: {icon} **{displayName}:**
- Speak in {communication_language}.
- Scale your response to the substance — don't pad. If you have a brief point, make it briefly.
- Disagree with other agents when your expertise tells you to. Don't hedge or be polite about it.
- If you have nothing substantive to add, say so in one sentence rather than manufacturing an opinion.
- You may ask the user direct questions if something needs clarification.
- Do NOT use tools. Just respond with your perspective.
```

**Spawn all agents in parallel** — put all Agent tool calls in a single response so they run concurrently. If `--model` was specified, use that model for all subagents. Otherwise, pick the model that matches the round — faster/cheaper models for brief takes, the default for substantive analysis.

**Solo mode** — if `--solo` is active, skip spawning. Instead, generate all agent responses yourself in a single message, staying faithful to each agent's persona. Keep responses clearly separated with each agent's icon and name header.

### 3. Present Responses

Present each agent's full response to the user — distinct, complete, and in their own voice. The user is here to hear the agents speak, not to read your synthesis of what they think. Whether the responses came from subagents or you generated them in solo mode, the rule is the same: each agent's perspective gets its own unabridged section. Never blend, paraphrase, or condense agent responses into a summary.

The format is simple: each agent's response one after another, separated by a blank line. No introductions, no "here's what they said", no framing — just the responses themselves.

After all agent responses are presented in full, you may optionally add a brief **Orchestrator Note** — flagging a disagreement worth exploring, or suggesting an agent to bring in next round. Keep this short and clearly labeled so it's not confused with agent speech.

### 4. Speak Each Response Aloud — MANDATORY

**This step is not optional.** Party mode's entire value is the agents speaking in their own voices. Skipping this step means the user gets silent text — the same thing they'd get from any other workflow. Do not skip it. Do not condition it on whether the user "seems to want audio." Always run it.

After presenting all responses in text (step 3), call the cross-platform BMAD speech entry point **once per agent, sequentially** (never in parallel — each call must finish before the next starts, otherwise voices overlap):

```bash
node bin/bmad-speak.js "{displayName}" "{their response text — truncate to ~300 chars for TTS}"
```

Rules:
- Use the agent's `{displayName}` exactly as it appears in the manifest (case-sensitive). The script maps it to the agent ID and loads that agent's full BMAD voice profile automatically — **do not pass any voice, reverb, music, or personality flags**. The script handles all of them.
- Truncate the response to roughly 300 characters for TTS — full text in chat, condensed for audio.
- Strip any leading icon + bold-name header (e.g. `📊 **Mary:** `) before passing to bmad-speak; it's already announced via voice/pretext.
- Run the calls in the **same order** the responses appear in your text output, so audio and text match.
- This script delegates to `.claude/hooks-windows/bmad-speak.ps1` on Windows and `.claude/hooks/bmad-speak.sh` on Linux/macOS/WSL. Each call blocks until playback completes.

**What the script applies per agent (read automatically from `~/.agentvibes/bmad-voice-map.json`):**
- **`voice`** — the Piper/ElevenLabs voice (e.g. `en_US-libritts-high::Frank-11` for the architect)
- **`pretext`** — the spoken intro phrase prepended to the dialogue (e.g. "Winston here." before the response)
- **`reverbPreset`** — reverb profile applied during synthesis (cathedral, room, etc., when configured)
- **`personality`** — affects voice modulation/style
- **`backgroundMusic.track` / `.volume` / `.enabled`** — per-agent ambient music played underneath their speech (e.g. Late Night Hip Hop Groove under the architect, harp under the analyst)

If audio plays but voices sound identical, the agent isn't found in the voice-map — check that `~/.agentvibes/bmad-voice-map.json` has an entry under `agents.<agent-id>` matching the display-name → ID mapping in `_bmad/_config/agent-manifest.csv`. If the script exits silently with no audio at all, the project is likely missing `_bmad/_config/agent-manifest.csv` (bmad-speak refuses to run without BMAD installed at the project root).

A PostToolUse hook (`~/.claude/hooks/bmad-party-speak.sh`) also tries to auto-speak responses after each `Agent` tool call. Treat that hook as a backup — your explicit `bmad-speak.js` calls are the primary mechanism. Calling explicitly guarantees audio even if the hook fingerprint or environment fails.

### 5. Handle Follow-ups

The user drives what happens next. Common patterns:

| User says... | You do... |
|---|---|
| Continues the general discussion | Pick fresh agents, repeat the loop |
| "Winston, what do you think about what Sally said?" | Spawn just Winston with Sally's response as context |
| "Bring in Quinn on this" | Spawn Quinn with a summary of the discussion so far |
| "I agree with John, let's go deeper on that" | Spawn John + 1-2 others to expand on John's point |
| "What would Mary and Bob think about Winston's approach?" | Spawn Mary and Bob with Winston's response as context |
| Asks a question directed at everyone | Back to step 1 with all agents |

The key insight: you can spawn any combination at any time. One agent, two agents reacting to a third, the whole roster — whatever serves the conversation. Each spawn is cheap and independent.

## Keeping Context Manageable

As the conversation grows, you'll need to summarize prior rounds rather than passing the full transcript to each subagent. Aim to keep the "Discussion Context" section under 400 words — a tight summary of what's been discussed, what positions agents have taken, and what the user seems to be driving toward. Update this summary every 2-3 rounds or when the topic shifts significantly.

## When Things Go Sideways

- **Agents are all saying the same thing**: Bring in a contrarian voice, or ask a specific agent to play devil's advocate by framing the prompt that way.
- **Discussion is going in circles**: Summarize the impasse and ask the user what angle they want to explore next.
- **User seems disengaged**: Ask directly — continue, change topic, or wrap up?
- **Agent gives a weak response**: Don't retry. Present it and let the user decide if they want more from that agent.

## Exit

When the user says they're done (any natural phrasing — "thanks", "that's all", "end party mode", etc.), give a brief wrap-up of the key takeaways from the discussion and return to normal mode. Don't force exit triggers — just read the room.

Clean up the context file on exit:
```bash
rm -f {project-root}/.bmad-agent-context
```
