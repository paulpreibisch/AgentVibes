# AgentVibes × Hermes Integration

Give your [Hermes Agent](https://github.com/NousResearch/hermes-agent) a voice — stream every response as spoken audio to your laptop, phone, or any device running AgentVibes.

---

## Skills

### 1. `agentvibes-target` — Send TTS to a Remote Device

**Location:** `skills/agentvibes-target/SKILL.md`

Teach Hermes how to send any text to your AgentVibes receiver over SSH. Use this when you want to manually trigger TTS from Hermes, or when building automations that speak results.

**Install:**
```bash
cp -r skills/agentvibes-target ~/.hermes/skills/
```

---

### 2. `hermes-agentvibes-hook` — Auto-Speak Every Response

**Location:** `skills/tts/hermes-agentvibes-hook/SKILL.md`

A complete Hermes hook + Python handler that fires on every `agent:end` event and speaks the response via AgentVibes. Set it up once and every Hermes reply is automatically spoken.

**Install:**
```bash
cp -r skills/tts/hermes-agentvibes-hook ~/.hermes/skills/tts/
```

Then follow the setup instructions in the SKILL.md to create the hook files and restart the gateway.

---

## Prerequisites

1. **AgentVibes installed** on the machine with speakers — `npx agentvibes install`
2. **SSH key** configured for the `agentvibes-receiver` user on the target machine
3. **Tailscale** (recommended) for secure cross-network connectivity

See the [SSH Remote Setup guide](../SSH_REMOTE_SETUP.md) for full receiver configuration.
