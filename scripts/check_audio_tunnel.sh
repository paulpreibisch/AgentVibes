#!/bin/bash

echo "🎵 Audio Tunnel Status:"
if nc -z localhost 14713 >/dev/null 2>&1; then
    if pactl info >/dev/null 2>&1; then
        echo "✅ Audio tunnel active - PulseAudio connected to Windows speakers"
        server_name=$(pactl info 2>/dev/null | grep "Host Name" | cut -d: -f2 | xargs)
        echo "🎯 Connected to: $server_name"
        echo "In a few moments, you should hear a test message through your Windows speakers."

        # Play test sound using piper TTS
        test_message="Audio tunnel is working correctly."
        echo "$test_message" | ~/piper/piper -m ~/piper_models/en_US-lessac-medium.onnx --output-raw | paplay --raw --channels=1 --rate=22050 --format=s16le
    else
        echo "🟡 Port 14713 open but PulseAudio connection failed"
    fi
else
    echo "❌ Audio tunnel not active - no connection on port 14713"
    echo "💡 Connect via VS Code using SSH config: ubuntu-rdp"
fi
echo ""
