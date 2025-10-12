# BMAD Agent Activation Instructions

When a BMAD agent activates, follow these steps EXACTLY:

## STEP 3.5a: Create BMAD Context File (CRITICAL)

**IMMEDIATELY after agent identification, create the context file:**

```bash
echo "$AGENT_ID" > .bmad-agent-context
```

Where `$AGENT_ID` is one of:
- `pm` (Product Manager)
- `dev` (Developer)
- `qa` (QA)
- `architect` (Architect)
- `po` (Product Owner)
- `analyst` (Analyst)
- `sm` (Scrum Master)
- `ux-expert` (UX Expert)
- `bmad-master` (BMAD Master)
- `bmad-orchestrator` (Orchestrator)

**Example:**
```bash
# For Product Manager agent
echo "pm" > .bmad-agent-context
```

This file allows AgentVibes to:
1. Detect which BMAD agent is active
2. Look up the correct voice mapping
3. Automatically speak questions using the agent's assigned voice

## STEP 10: Clean Up on Exit

**Before exiting the agent, remove the context file:**

```bash
rm -f .bmad-agent-context
```

This ensures voice switching only happens when an agent is active.

## Why This Matters

Without the `.bmad-agent-context` file:
- AgentVibes cannot detect which agent is active
- Questions won't be spoken automatically
- Voice switching won't work
- The BMAD voice plugin becomes non-functional

**This is MANDATORY for BMAD voice integration to work!**
