#!/bin/bash
# macOS SSH Audio Greeting - Add to ~/.bashrc or ~/.bash_profile on your Mac
# This plays a greeting when you SSH in, confirming audio tunnel is working

# Always set PulseAudio environment for SSH sessions
if [[ -n "$SSH_CONNECTION" ]]; then
    export PULSE_SERVER=tcp:localhost:14714
    export PULSE_COOKIE_FILE=~/.config/pulse/cookie_wsl
fi

# Only play greeting for interactive sessions (has PS1 set)
# Use a flag file to only greet once per tunnel session
if [[ -n "$SSH_CONNECTION" && -n "$PS1" ]]; then
    GREETING_FLAG="/tmp/.agentvibes_greeted_$$"

    # Run audio test in background so login isn't delayed
    (
        # Check if PulseAudio connection works
        if /opt/homebrew/bin/pactl info > /dev/null 2>&1; then
            # Only play greeting if we haven't already in this shell
            if [[ ! -f "$GREETING_FLAG" ]]; then
                touch "$GREETING_FLAG"
                TEMP_AUDIO="/tmp/ssh_greeting_$$.aiff"
                say -o "$TEMP_AUDIO" "Audio connected." 2>/dev/null
                if [[ -f "$TEMP_AUDIO" ]]; then
                    /opt/homebrew/bin/paplay "$TEMP_AUDIO" 2>/dev/null
                    rm -f "$TEMP_AUDIO"
                fi
            fi
        else
            echo "[AgentVibes] Audio tunnel not connected (port 14714)" >&2
        fi
    ) &
fi
