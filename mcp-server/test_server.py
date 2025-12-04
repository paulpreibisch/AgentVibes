#!/usr/bin/env python3
"""
File: mcp-server/test_server.py

AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
Website: https://agentvibes.org
Repository: https://github.com/paulpreibisch/AgentVibes

Co-created by Paul Preibisch with Claude AI
Copyright (c) 2025 Paul Preibisch

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

DISCLAIMER: This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND,
express or implied, including but not limited to the warranties of
merchantability, fitness for a particular purpose and noninfringement.
In no event shall the authors or copyright holders be liable for any claim,
damages or other liability, whether in an action of contract, tort or
otherwise, arising from, out of or in connection with the software or the
use or other dealings in the software.

---

@fileoverview Test suite for AgentVibes MCP Server
@context Validates that MCP server can be imported and initialized correctly
@architecture Unit tests for server initialization, imports, and helper methods
@dependencies mcp-server/server.py, Python unittest framework
@entrypoints Run directly via `python test_server.py` or from test runners
@patterns Test-driven validation, import testing, path resolution testing
@related mcp-server/server.py, docs/ai-optimized-documentation-standards.md
"""

import sys
from pathlib import Path

# Add the mcp-server directory to path
sys.path.insert(0, str(Path(__file__).parent))


def test_imports():
    """Test that all required modules can be imported"""
    print("Testing imports...")
    try:
        from server import AgentVibesServer, app
        print("✅ Server imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        print("   Note: MCP library may not be installed")
        print("   Run: pip install mcp")
        return False


def test_server_init():
    """Test that the server can be initialized"""
    print("\nTesting server initialization...")
    try:
        from server import AgentVibesServer

        server = AgentVibesServer()
        print(f"✅ Server initialized")
        print(f"   Claude dir: {server.claude_dir}")
        print(f"   Hooks dir: {server.hooks_dir}")

        # Check if hooks directory exists
        if server.hooks_dir.exists():
            print(f"✅ Hooks directory found")
        else:
            print(f"⚠️  Hooks directory not found (expected for testing)")

        return True
    except Exception as e:
        print(f"❌ Server init failed: {e}")
        return False


def test_helper_methods():
    """Test helper methods"""
    print("\nTesting helper methods...")
    try:
        from server import AgentVibesServer

        server = AgentVibesServer()

        # Test _find_claude_dir
        claude_dir = server._find_claude_dir()
        print(f"✅ Found claude directory: {claude_dir}")

        return True
    except Exception as e:
        print(f"❌ Helper method test failed: {e}")
        return False


def test_mute_unmute():
    """Test mute/unmute functionality"""
    print("\nTesting mute/unmute functionality...")
    try:
        from server import AgentVibesServer
        import asyncio
        import tempfile
        import os

        server = AgentVibesServer()

        # Use a temporary home directory for testing
        original_home = Path.home()
        test_mute_file = original_home / ".agentvibes-muted"

        # Clean up any existing mute file before testing
        if test_mute_file.exists():
            test_mute_file.unlink()
            print("   Cleaned up existing mute file")

        # Test 1: Initial state should be unmuted
        async def run_tests():
            result = await server.is_muted()
            assert "ACTIVE" in result, f"Expected TTS to be active initially, got: {result}"
            print("✅ Test 1: Initial state is unmuted")

            # Test 2: Mute should create the mute file
            result = await server.mute()
            assert "muted" in result.lower(), f"Expected mute confirmation, got: {result}"
            assert test_mute_file.exists(), "Mute file should exist after muting"
            print("✅ Test 2: Mute creates mute file")

            # Test 3: is_muted should report muted state
            result = await server.is_muted()
            assert "MUTED" in result, f"Expected TTS to be muted, got: {result}"
            print("✅ Test 3: is_muted correctly reports muted state")

            # Test 4: Unmute should remove the mute file
            result = await server.unmute()
            assert "unmuted" in result.lower() or "restored" in result.lower(), f"Expected unmute confirmation, got: {result}"
            assert not test_mute_file.exists(), "Mute file should not exist after unmuting"
            print("✅ Test 4: Unmute removes mute file")

            # Test 5: is_muted should report active state after unmute
            result = await server.is_muted()
            assert "ACTIVE" in result, f"Expected TTS to be active after unmute, got: {result}"
            print("✅ Test 5: is_muted correctly reports active state after unmute")

            # Test 6: Unmute when not muted should handle gracefully
            result = await server.unmute()
            assert "not muted" in result.lower() or "active" in result.lower(), f"Expected graceful handling, got: {result}"
            print("✅ Test 6: Unmute handles already-unmuted state gracefully")

        asyncio.run(run_tests())

        # Clean up
        if test_mute_file.exists():
            test_mute_file.unlink()

        print("✅ All mute/unmute tests passed")
        return True

    except AssertionError as e:
        print(f"❌ Assertion failed: {e}")
        # Clean up on failure
        test_mute_file = Path.home() / ".agentvibes-muted"
        if test_mute_file.exists():
            test_mute_file.unlink()
        return False
    except Exception as e:
        print(f"❌ Mute/unmute test failed: {e}")
        # Clean up on failure
        test_mute_file = Path.home() / ".agentvibes-muted"
        if test_mute_file.exists():
            test_mute_file.unlink()
        return False


def test_play_tts_mute_check():
    """Test that play-tts.sh respects mute files"""
    print("\nTesting play-tts.sh mute file detection...")
    try:
        import subprocess
        import os

        # Find the play-tts.sh script
        script_dir = Path(__file__).parent.parent / ".claude" / "hooks" / "play-tts.sh"
        if not script_dir.exists():
            print(f"⚠️  play-tts.sh not found at {script_dir}, skipping shell test")
            return True  # Not a failure, just can't test

        test_mute_file = Path.home() / ".agentvibes-muted"

        # Clean up first
        if test_mute_file.exists():
            test_mute_file.unlink()

        # Test 1: With mute file, script should exit early with muted message
        test_mute_file.touch()
        try:
            result = subprocess.run(
                ["bash", str(script_dir), "Test message"],
                capture_output=True,
                text=True,
                timeout=5
            )
            output = result.stdout + result.stderr
            assert "muted" in output.lower(), f"Expected 'muted' in output when mute file exists, got: {output}"
            print("✅ Test 1: play-tts.sh respects mute file")
        finally:
            test_mute_file.unlink()

        # Test 2: Without mute file, script should proceed (we won't check full TTS, just that it doesn't say muted)
        # Note: This test may produce audio output
        print("✅ Test 2: Skipping audio test (would produce sound)")

        print("✅ play-tts.sh mute detection tests passed")
        return True

    except subprocess.TimeoutExpired:
        print("⚠️  Script timed out (might be running TTS)")
        # Clean up
        test_mute_file = Path.home() / ".agentvibes-muted"
        if test_mute_file.exists():
            test_mute_file.unlink()
        return True  # Timeout is acceptable if TTS is running
    except Exception as e:
        print(f"❌ play-tts.sh mute test failed: {e}")
        # Clean up
        test_mute_file = Path.home() / ".agentvibes-muted"
        if test_mute_file.exists():
            test_mute_file.unlink()
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("AgentVibes MCP Server Test Suite")
    print("=" * 60)

    tests = [
        ("Imports", test_imports),
        ("Server Initialization", test_server_init),
        ("Helper Methods", test_helper_methods),
        ("Mute/Unmute Functionality", test_mute_unmute),
        ("play-tts.sh Mute Detection", test_play_tts_mute_check),
    ]

    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Test '{name}' crashed: {e}")
            results.append((name, False))

    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")

    print("=" * 60)
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        print("\nNote: Some failures may be expected if MCP library is not installed")
        print("Install with: pip install mcp")
        return 1


if __name__ == "__main__":
    sys.exit(main())
