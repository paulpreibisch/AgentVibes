# 🎤 ElevenLabs Premium Voice Setup

**Want the best voice quality?** ElevenLabs offers premium AI voices that sound incredibly natural.

⚠️ **Note**: ElevenLabs is a paid service after the free trial.

---

## What You Get

✅ **Premium Voice Quality** - The most natural-sounding AI voices available

✅ **30+ Voices** - Wide variety of accents, ages, and styles

✅ **Multi-Language** - 25+ languages supported

✅ **No WSL Required** - Works on Windows without Linux subsystem

❌ **Costs Money** - Free trial (10,000 characters), then requires paid subscription

---

## Step 1: Get Your ElevenLabs API Key

1. **Sign up for ElevenLabs**:
   - Go to https://try.elevenlabs.io/agentvibes
   - Click "Sign Up" (or "Log In" if you have an account)
   - Complete registration

2. **Get your API key**:
   - Go to https://elevenlabs.io/app/settings/api-keys
   - Click "Create API Key" (or copy existing key)
   - **Save this key** - you'll need it in the next step

3. **Check your free trial**:
   - Free trial includes 10,000 characters
   - After trial, you'll need a paid subscription
   - See pricing: https://elevenlabs.io/pricing

---

## Step 2: Set Your API Key in Windows

1. **Open PowerShell**:
   - Press `Windows Key`
   - Type `PowerShell`
   - Click "Windows PowerShell"

2. **Set the API key**:
   - Type this command (replace `your-api-key-here` with your actual key):
     ```powershell
     setx ELEVENLABS_API_KEY "your-api-key-here"
     ```
   - Press Enter
   - You should see: "SUCCESS: Specified value was saved."

3. **Restart everything**:
   - Close PowerShell
   - Close Claude Desktop completely (check system tray)
   - Wait 5 seconds
   - Open Claude Desktop again

---

## Step 3: Switch to ElevenLabs Provider

In Claude Desktop, type:

```
Switch to ElevenLabs provider
```

Claude will confirm the switch and you'll start using premium voices!

---

## Testing ElevenLabs Voices

### Test Your Setup

Type:
```
Use text to speech to say "Hello from ElevenLabs!"
```

You should hear premium quality audio!

### Browse Available Voices

Type:
```
List all available voices
```

You'll see voices like:
- **Aria** (default, warm female)
- **Northern Terry** (friendly male)
- **Cowboy Bob** (western male)
- **Jessica Anne Bogart** (professional female)
- **Ms. Walker** (mature female)
- And many more!

### Change Voice

Type:
```
Switch to Northern Terry voice
```

---

## Managing Your Usage

### Check Your Quota

1. Go to https://elevenlabs.io/app/usage
2. See how many characters you've used
3. Monitor your free trial or subscription limit

### Tips to Save Characters

- Keep TTS messages short and concise
- Use TTS for important notifications only
- Switch to Piper (free) for less critical audio

---

## Switching Back to Piper (Free)

Want to go back to the free voices?

Type in Claude Desktop:
```
Switch to Piper provider
```

You can switch between providers anytime!

---

## Troubleshooting

### "No audio output"

1. **Check your API key**:
   - Open PowerShell
   - Type: `echo $env:ELEVENLABS_API_KEY`
   - You should see your API key (not blank)

2. **Verify internet connection**:
   - ElevenLabs requires internet
   - Try opening https://elevenlabs.io in your browser

3. **Check quota**:
   - Go to https://elevenlabs.io/app/usage
   - Make sure you haven't exceeded your character limit

4. **Check logs**:
   - Press `Windows Key + R`
   - Paste: `%APPDATA%\Claude\logs\mcp-server-agentvibes.log`
   - Look for error messages related to ElevenLabs

### "Invalid API key" error

Your API key is wrong or expired:

1. Go to https://elevenlabs.io/app/settings/api-keys
2. Create a new API key
3. Set it again in PowerShell:
   ```powershell
   setx ELEVENLABS_API_KEY "your-new-key-here"
   ```
4. Restart Claude Desktop

### "Quota exceeded" error

You've used all your free credits:

1. Go to https://elevenlabs.io/pricing
2. Choose a paid plan
3. Or switch back to Piper (free):
   ```
   Switch to Piper provider
   ```

---

## Pricing Information

As of 2024:

- **Free Trial**: 10,000 characters
- **Starter Plan**: ~$5/month for 30,000 characters
- **Creator Plan**: ~$22/month for 100,000 characters
- **Pro Plan**: ~$99/month for 500,000 characters

**Note**: Prices subject to change. Check https://elevenlabs.io/pricing for current rates.

---

## Next Steps

✅ **You're using premium voices!**

Explore more:

- 🎭 **[Personality Guide](personalities.md)** - Add personality styles
- 🌍 **[Language Learning Mode](language-learning-mode.md)** - Learn languages
- 🎤 **[Voice Library](voice-library.md)** - Browse all ElevenLabs voices

---

**[← Back to Windows Setup Guide](../mcp-server/WINDOWS_SETUP.md)**
