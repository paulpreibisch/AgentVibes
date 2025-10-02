# /agent-vibes:personality

Set or customize the personality style for TTS messages.

This command allows you to add character and emotion to your TTS announcements by applying personality modifiers to messages.

## Usage

```bash
# Set a personality
/agent-vibes:personality flirty
/agent-vibes:personality sarcastic

# List all personalities
/agent-vibes:personality list

# Add custom personality
/agent-vibes:personality add cowboy "Howdy partner!" "Yeehaw!"

# Show current personality
/agent-vibes:personality get

# Reset to normal
/agent-vibes:personality reset
```

## Available Personalities

- **normal** - Standard professional tone
- **flirty** - Playful and charming
- **angry** - Frustrated and irritated
- **sassy** - Bold with attitude
- **moody** - Melancholic and brooding
- **funny** - Lighthearted and comedic
- **sarcastic** - Dry wit and irony
- **poetic** - Elegant and lyrical
- **annoying** - Over-enthusiastic
- **professional** - Formal and precise
- **pirate** - Seafaring swagger
- **robot** - Mechanical and precise
- **valley-girl** - California casual
- **zen** - Peaceful and mindful
- **dramatic** - Theatrical flair
- **random** - Picks a different personality each time!

## Custom Personalities

Create your own personality with:
```bash
/agent-vibes:personality add <name> <prefix> <suffix>
```

Examples:
- `/agent-vibes:personality add cowboy "Howdy!" "Partner!"`
- `/agent-vibes:personality add butler "At your service." "As you wish."`
- `/agent-vibes:personality add surfer "Dude!" "Totally rad!"`

## Implementation

!bash .claude/hooks/personality-manager.sh $ARGUMENTS