#!/usr/bin/env python3
"""
File: mcp-server/test_windows_script_parity.py

AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
Website: https://agentvibes.org
Repository: https://github.com/paulpreibisch/AgentVibes

Co-created by Paul Preibisch with Claude AI
Copyright (c) 2025 Paul Preibisch

Licensed under the Apache License, Version 2.0

---

@fileoverview Windows script parity tests - proves missing scripts break MCP tools
@context Test-first approach: these tests SHOULD FAIL until Windows scripts are ported
@architecture pytest-style tests validating script existence and MCP integration
"""

import os
import sys
import platform
from pathlib import Path

# Add the mcp-server directory to path
sys.path.insert(0, str(Path(__file__).parent))

IS_WINDOWS = platform.system() == "Windows" and not os.environ.get("WSL_DISTRO_NAME")

# Resolve project paths
PROJECT_ROOT = Path(__file__).parent.parent
HOOKS_WINDOWS = PROJECT_ROOT / ".claude" / "hooks-windows"
HOOKS_LINUX = PROJECT_ROOT / ".claude" / "hooks"


# =============================================================
# Suite 1: Every .sh script called by MCP must have a .ps1
# =============================================================

# Scripts the MCP server calls via _run_script() with hardcoded .sh names
# The auto-conversion (server.py:902-903) converts .sh -> .ps1
MCP_HARDCODED_SCRIPTS = [
    "provider-manager",
    "learn-manager",
    "speed-manager",
    "download-extra-voices",
    "verbosity-manager",
    "clean-audio-cache",
]

# Scripts set via class constants (already .ps1 on Windows)
MCP_CLASS_CONSTANT_SCRIPTS = [
    "voice-manager-windows",   # VOICE_MANAGER_SCRIPT override
    "personality-manager",     # PERSONALITY_MANAGER_SCRIPT
    "language-manager",        # LANGUAGE_MANAGER_SCRIPT
    "background-music-manager",  # BACKGROUND_MUSIC_MANAGER_SCRIPT
    "effects-manager",         # EFFECTS_MANAGER_SCRIPT
]


def test_hardcoded_scripts_have_ps1():
    """Every .sh script called via _run_script must have a .ps1 in hooks-windows/"""
    print("\nTesting hardcoded .sh -> .ps1 script parity...")
    missing = []

    for script_name in MCP_HARDCODED_SCRIPTS:
        ps1_path = HOOKS_WINDOWS / f"{script_name}.ps1"
        sh_path = HOOKS_LINUX / f"{script_name}.sh"

        sh_exists = sh_path.exists()
        ps1_exists = ps1_path.exists()

        if sh_exists and not ps1_exists:
            missing.append(script_name)
            print(f"  FAIL: {script_name}.sh exists but {script_name}.ps1 is MISSING")
        elif ps1_exists:
            print(f"  PASS: {script_name}.ps1 exists")
        else:
            print(f"  SKIP: {script_name}.sh doesn't exist either")

    if missing:
        print(f"\n  {len(missing)} missing .ps1 scripts: {', '.join(missing)}")
    assert len(missing) == 0, (
        f"Missing Windows scripts for MCP: {', '.join(missing)}. "
        f"These MCP tools silently fail on Windows."
    )
    print("  All hardcoded scripts have .ps1 equivalents")
    return True


def test_class_constant_scripts_exist():
    """Every script set via class constants must exist in hooks-windows/"""
    print("\nTesting class constant script existence...")
    missing = []

    for script_name in MCP_CLASS_CONSTANT_SCRIPTS:
        ps1_path = HOOKS_WINDOWS / f"{script_name}.ps1"
        if not ps1_path.exists():
            missing.append(script_name)
            print(f"  FAIL: {script_name}.ps1 is MISSING")
        else:
            print(f"  PASS: {script_name}.ps1 exists")

    if missing:
        print(f"\n  {len(missing)} missing .ps1 scripts: {', '.join(missing)}")
    assert len(missing) == 0, (
        f"Missing Windows scripts (class constants): {', '.join(missing)}. "
        f"These MCP tools fail on Windows."
    )
    print("  All class constant scripts exist")
    return True


# =============================================================
# Suite 2: MCP _run_script returns proper errors for missing scripts
# =============================================================

def test_run_script_error_for_missing():
    """Verify _run_script returns 'Script not found' for missing scripts (Windows only)"""
    if not IS_WINDOWS:
        print("\nSkipping _run_script test (not Windows)")
        return True

    print("\nTesting _run_script error handling for missing scripts...")
    try:
        from server import AgentVibesServer
        import asyncio

        server = AgentVibesServer()

        async def check_missing():
            # Try calling a script we know doesn't exist
            result = await server._run_script("definitely-does-not-exist.ps1", [])
            assert "Script not found" in result, (
                f"Expected 'Script not found' for missing script, got: {result}"
            )
            print("  PASS: _run_script returns 'Script not found' for missing scripts")

        asyncio.run(check_missing())
        return True

    except ImportError:
        print("  SKIP: MCP library not installed")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


# =============================================================
# Suite 3: MCP tools that depend on missing scripts
# =============================================================

MCP_TOOL_SCRIPT_MAP = {
    "set_speed": "speed-manager",
    "get_speed": "speed-manager",
    "set_learn_mode": "learn-manager",
    "set_verbosity": "verbosity-manager",
    "get_verbosity": "verbosity-manager",
    "mute": "verbosity-manager",
    "unmute": "verbosity-manager",
    "is_muted": "verbosity-manager",
    "set_personality": "personality-manager",
    "list_personalities": "personality-manager",
    "set_language": "language-manager",
    "clean_audio_cache": "clean-audio-cache",
}


def test_mcp_tools_have_backing_scripts():
    """Every MCP tool must have its backing script on Windows"""
    print("\nTesting MCP tool -> script mapping on Windows...")
    broken_tools = []

    for tool_name, script_name in MCP_TOOL_SCRIPT_MAP.items():
        ps1_path = HOOKS_WINDOWS / f"{script_name}.ps1"
        if not ps1_path.exists():
            broken_tools.append((tool_name, script_name))
            print(f"  FAIL: MCP tool '{tool_name}' -> {script_name}.ps1 MISSING")
        else:
            print(f"  PASS: MCP tool '{tool_name}' -> {script_name}.ps1 exists")

    if broken_tools:
        tool_list = ", ".join(f"{t[0]} ({t[1]}.ps1)" for t in broken_tools)
        print(f"\n  {len(broken_tools)} broken MCP tools: {tool_list}")
    assert len(broken_tools) == 0, (
        f"Broken MCP tools on Windows: "
        + ", ".join(f"{t[0]}" for t in broken_tools)
    )
    print("  All MCP tools have backing scripts")
    return True


# =============================================================
# Suite 4: Provider naming validation
# =============================================================

def test_provider_names_consistent():
    """Verify MCP server accepts unified provider names"""
    if not IS_WINDOWS:
        print("\nSkipping provider naming test (not Windows)")
        return True

    print("\nTesting provider naming consistency...")
    try:
        from server import AgentVibesServer

        server = AgentVibesServer()

        # The MCP server hardcodes different valid providers per platform
        # On Windows: ["windows-piper", "windows-sapi", "soprano"]
        # The provider-manager.ps1 also accepts: ["piper", "sapi"]
        # This creates a mismatch where scripts accept names MCP rejects

        # Read the valid_providers from set_provider source
        import inspect
        source = inspect.getsource(server.set_provider)

        if "windows-piper" in source and "piper" not in source.replace("windows-piper", ""):
            print("  INFO: MCP only accepts 'windows-piper', not 'piper' on Windows")
            print("  INFO: But provider-manager.ps1 accepts both")
            print("  WARN: This creates a one-way trap - consider unifying to 'piper'")

        # Check that play-tts scripts match provider names
        for provider in ["piper", "sapi", "soprano"]:
            windows_name = f"play-tts-windows-{provider}.ps1"
            unified_name = f"play-tts-{provider}.ps1"
            has_windows = (HOOKS_WINDOWS / windows_name).exists()
            has_unified = (HOOKS_WINDOWS / unified_name).exists()

            if has_windows and not has_unified:
                print(f"  WARN: {windows_name} exists but {unified_name} does not")
                print(f"         Auto-conversion from play-tts-{provider}.sh would look for {unified_name}")

        print("  Provider naming test complete (warnings above need fixing)")
        return True

    except ImportError:
        print("  SKIP: MCP library not installed")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


# =============================================================
# Suite 5: Voice manager naming mismatch
# =============================================================

def test_voice_manager_naming():
    """voice-manager.sh auto-converts to voice-manager.ps1 but file is voice-manager-windows.ps1"""
    print("\nTesting voice-manager naming consistency...")

    # The auto-conversion would produce voice-manager.ps1
    auto_converted = HOOKS_WINDOWS / "voice-manager.ps1"
    actual_file = HOOKS_WINDOWS / "voice-manager-windows.ps1"
    linux_file = HOOKS_LINUX / "voice-manager.sh"

    print(f"  Linux script: voice-manager.sh exists = {linux_file.exists()}")
    print(f"  Auto-converted name: voice-manager.ps1 exists = {auto_converted.exists()}")
    print(f"  Actual Windows file: voice-manager-windows.ps1 exists = {actual_file.exists()}")

    if actual_file.exists() and not auto_converted.exists():
        print("  WARN: Naming mismatch detected!")
        print("        MCP class constant overrides this, but it's fragile")
        # This is informational, not a hard failure since the class constant handles it
        # But it should be fixed for consistency

    if linux_file.exists():
        assert auto_converted.exists() or actual_file.exists(), (
            "voice-manager has no Windows equivalent at all"
        )

    print("  Voice manager naming test complete")
    return True


# =============================================================
# Main
# =============================================================

def main():
    """Run all parity tests"""
    print("=" * 60)
    print("AgentVibes Windows Script Parity Tests")
    print(f"Platform: {platform.system()} (IS_WINDOWS={IS_WINDOWS})")
    print(f"hooks-windows/: {HOOKS_WINDOWS}")
    print("=" * 60)

    tests = [
        ("Hardcoded .sh scripts have .ps1 equivalents", test_hardcoded_scripts_have_ps1),
        ("Class constant scripts exist", test_class_constant_scripts_exist),
        ("_run_script error handling", test_run_script_error_for_missing),
        ("MCP tools have backing scripts", test_mcp_tools_have_backing_scripts),
        ("Provider naming consistency", test_provider_names_consistent),
        ("Voice manager naming", test_voice_manager_naming),
    ]

    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result, None))
        except AssertionError as e:
            print(f"\n  ASSERTION FAILED: {e}")
            results.append((name, False, str(e)))
        except Exception as e:
            print(f"\n  ERROR: {e}")
            results.append((name, False, str(e)))

    print("\n" + "=" * 60)
    print("PARITY TEST RESULTS")
    print("=" * 60)

    passed = sum(1 for _, result, _ in results if result)
    failed = sum(1 for _, result, _ in results if not result)

    for name, result, error in results:
        status = "PASS" if result else "FAIL"
        print(f"  [{status}] {name}")
        if error:
            print(f"         {error[:100]}")

    print("=" * 60)
    print(f"Passed: {passed}/{len(results)}  Failed: {failed}/{len(results)}")

    if failed > 0:
        print(f"\n{failed} test(s) failed — these represent missing Windows scripts")
        print("See GitHub issue #157 for the full platform parity plan")

    return 1 if failed > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
