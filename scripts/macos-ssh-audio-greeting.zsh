# macOS SSH Audio Greeting for ZSH
# Add to ~/.zshrc on your Mac: source ~/macos-ssh-audio-greeting.zsh

# Always set PulseAudio environment for SSH sessions
if [[ -n "$SSH_CONNECTION" ]]; then
    export PULSE_SERVER=tcp:localhost:14714
    export PULSE_COOKIE_FILE=~/.config/pulse/cookie_wsl
fi

# Only play greeting for interactive sessions
if [[ -n "$SSH_CONNECTION" && -o interactive ]]; then
    # Run audio test in background so login isn't delayed
    (
        # Check if PulseAudio connection works
        if /opt/homebrew/bin/pactl info > /dev/null 2>&1; then
            TEMP_AUDIO="/tmp/ssh_greeting_$$.aiff"
            say -o "$TEMP_AUDIO" "Connected to Mac OS." 2>/dev/null
            if [[ -f "$TEMP_AUDIO" ]]; then
                /opt/homebrew/bin/paplay "$TEMP_AUDIO" 2>/dev/null
                rm -f "$TEMP_AUDIO"
            fi
        else
            echo "[AgentVibes] Audio tunnel not connected (port 14714)" >&2
        fi
    ) &!
fi
