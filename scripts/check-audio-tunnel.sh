#\!/bin/bash
# Check if audio tunnel is active

echo ""
echo "🔊 Checking Audio Tunnel Status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if \! ss -tlnp 2>/dev/null | grep -q :14713; then
    echo "❌ WARNING: Audio tunnel NOT detected\!"
    echo ""
    echo "   The SSH RemoteForward port 14713 is not listening."
    echo "   This means TTS audio will NOT play on your Windows speakers."
    echo ""
    echo "   📋 Possible Causes:"
    echo "      • VS Code did not establish the RemoteForward tunnel"
    echo "      • Port 14713 is already in use by another process"
    echo "      • SSH config RemoteForward was not applied"
    echo ""
    echo "   🔧 To Fix:"
    echo "      1. Close this VS Code session"
    echo "      2. On Windows, open PowerShell and run:"
    echo "         ssh -N -R 14713:localhost:14713 ubuntu-rdp"
    echo "      3. Keep that PowerShell window open"
    echo "      4. Reconnect VS Code"
    echo ""
    echo "   📚 Or check VS Code settings:"
    echo "      • Verify: remote.SSH.useExecServer = false"
    echo "      • Verify: remote.SSH.configFile points to ~/.ssh/config"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    return 1
else
    echo "✅ Audio tunnel is ACTIVE\!"
    echo ""
    echo "   Port 14713 is listening and ready for audio."
    echo ""
    
    # Set PULSE_SERVER environment variable
    export PULSE_SERVER=tcp:localhost:14713
    
    # Test PulseAudio connection
    echo "   Testing PulseAudio connection..."
    if pactl info >/dev/null 2>&1; then
        echo "   ✅ PulseAudio connected successfully\!"
        echo ""
        pactl info | head -5
        echo ""
        echo "   🎵 AgentVibes TTS will play through Windows speakers\!"
    else
        echo "   ⚠️  Tunnel exists but PulseAudio connection failed"
        echo "   Check if socat bridge is running on Windows:"
        echo "      wsl ss -tlnp | grep 14713"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi
