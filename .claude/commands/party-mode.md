---
description: 'BMAD party mode with AgentVibes per-agent voices (AgentVibes project override)'
---

Invoke the `bmad-party-mode` skill (the AgentVibes-flavored party mode with TTS wiring).

**Do not** load `@_bmad/core/workflows/party-mode/workflow.md` — that path does not exist in this project. The AgentVibes skill at `.claude/skills/bmad-party-mode/SKILL.md` is the canonical workflow here and includes the mandatory step that speaks each agent's response in their unique voice via `node bin/bmad-speak.js`.
