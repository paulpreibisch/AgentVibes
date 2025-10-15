#!/usr/bin/env python3
"""
Quick test script for AgentVibes MCP Server

Tests that the server can be imported and basic functionality works.
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


def main():
    """Run all tests"""
    print("=" * 60)
    print("AgentVibes MCP Server Test Suite")
    print("=" * 60)

    tests = [
        ("Imports", test_imports),
        ("Server Initialization", test_server_init),
        ("Helper Methods", test_helper_methods),
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
