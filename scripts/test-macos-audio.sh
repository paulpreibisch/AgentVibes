#!/bin/bash
echo "=========================================="
echo "Mac → Windows PulseAudio Tunnel Test"
echo "=========================================="
echo ""

export PULSE_SERVER=tcp:localhost:14714
export PULSE_COOKIE_FILE=~/.config/pulse/cookie_wsl

echo "[1/2] Testing connection to Windows PulseAudio..."
if /opt/homebrew/bin/pactl info > /dev/null 2>&1; then
    echo "✓ Connected to Windows PulseAudio!"
    /opt/homebrew/bin/pactl info | grep -E "Server Name|Default Sink"
else
    echo "✗ Cannot connect to Windows PulseAudio"
    exit 1
fi

echo ""
echo "[2/2] Playing audio through Windows speakers..."
TEMP_AUDIO="/tmp/windows_audio_test.aiff"

say -o "$TEMP_AUDIO" "Success! You are hearing this from the Mac, but it is playing on your Windows speakers through the PulseAudio tunnel."

if [ ! -f "$TEMP_AUDIO" ]; then
    echo "✗ Failed to generate audio"
    exit 1
fi

echo "  Generated audio file"
echo "  Sending to Windows speakers..."
/opt/homebrew/bin/paplay "$TEMP_AUDIO"
RESULT=$?

rm -f "$TEMP_AUDIO"

if [ $RESULT -eq 0 ]; then
    echo ""
    echo "✓ Audio sent successfully!"
    echo ""
    echo "🎵 Did you hear the audio on your WINDOWS speakers?"
else
    echo "✗ Failed to play audio (error $RESULT)"
fi

exit $RESULT
