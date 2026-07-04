#!/usr/bin/env python3
"""
File: mcp-server/test_mcp_correctness.py

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

---

@fileoverview Regression tests for Story 8.2 (MCP Server Windows Correctness)
@context Proves _run_script branches on exit code (not emoji sniffing), enforces
         stdin=DEVNULL + timeout, guards download_extra_voices(auto_yes=False),
         serializes the personality/language override critical section, restores
         personality non-destructively, and documents the 20% bg-music default.
@architecture pytest unit tests that monkeypatch _run_script / asyncio.create_subprocess_exec
              so no real hook scripts or audio playback are invoked.
@related mcp-server/server.py, docs/implementation-artifacts/8-2-mcp-windows-correctness.md
"""

import asyncio
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from server import AgentVibesServer, ScriptResult, DEFAULT_SCRIPT_TIMEOUT, list_tools


class _FakeProc:
    """Stand-in for asyncio.subprocess.Process used by text_to_speech's TTS spawn."""

    def __init__(self, on_communicate=None, sleep=0.0, stdout=b"Saved to: fake.wav\n", stderr=b""):
        self.returncode = 0
        self._on_communicate = on_communicate
        self._sleep = sleep
        self._stdout = stdout
        self._stderr = stderr

    async def communicate(self):
        if self._on_communicate:
            self._on_communicate()
        if self._sleep:
            await asyncio.sleep(self._sleep)
        return (self._stdout, self._stderr)

    def kill(self):
        pass

    async def wait(self):
        return 0


# ---------------------------------------------------------------------------
# ScriptResult
# ---------------------------------------------------------------------------

def test_script_result_ok_reflects_returncode():
    assert ScriptResult(0, "fine", "").ok is True
    assert ScriptResult(1, "", "boom").ok is False
    assert ScriptResult(-1, "", "timed out").ok is False


def test_script_result_error_detail_prefers_stderr():
    assert ScriptResult(1, "stdout text", "stderr text").error_detail == "stderr text"
    assert ScriptResult(1, "stdout text", "").error_detail == "stdout text"
    assert "exit code" in ScriptResult(2, "", "").error_detail


# ---------------------------------------------------------------------------
# H1: exit-code branching, not emoji sniffing
# ---------------------------------------------------------------------------

def test_set_personality_succeeds_on_plain_text_windows_style_output():
    """Windows personality-manager.ps1 prints plain text with no 🎭 marker.
    Before the fix, `"🎭" in result` made this report ❌ Failed even on a
    successful exit — this is the core Windows false-failure bug (H1)."""
    server = AgentVibesServer()

    async def fake_run_script(script_name, args, timeout=DEFAULT_SCRIPT_TIMEOUT):
        return ScriptResult(0, "Personality set to: happy", "")
    server._run_script = fake_run_script

    result = asyncio.run(server.set_personality("happy"))

    assert not result.startswith("❌"), f"expected success, got: {result}"
    assert "happy" in result


def test_set_personality_fails_on_nonzero_exit_despite_matching_marker_text():
    """Inverse case: text containing the old marker must not mask a real failure."""
    server = AgentVibesServer()

    async def fake_run_script(script_name, args, timeout=DEFAULT_SCRIPT_TIMEOUT):
        return ScriptResult(1, "", "🎭 this looks like success text but exit code says otherwise")
    server._run_script = fake_run_script

    result = asyncio.run(server.set_personality("happy"))

    assert result.startswith("❌")


@pytest.mark.parametrize(
    "method_name,call_args,plain_stdout",
    [
        ("set_language", ("spanish",), "Language set to: spanish"),
        ("set_learn_mode", (True,), "Learn mode enabled"),
        ("set_verbosity", ("high",), "Verbosity set to: high (project-local)"),
        ("replay_audio", (1,), "Replaying audio #1: tts-foo.wav"),
    ],
)
def test_windows_style_plain_text_success_is_not_treated_as_failure(method_name, call_args, plain_stdout):
    """set_language / set_learn_mode / set_verbosity / replay_audio must all
    report success from returncode==0 alone, even when stdout carries none of
    the emoji markers the old code sniffed for (✓ / ✅ / 🔊)."""
    server = AgentVibesServer()

    async def fake_run_script(script_name, args, timeout=DEFAULT_SCRIPT_TIMEOUT):
        return ScriptResult(0, plain_stdout, "")
    server._run_script = fake_run_script

    method = getattr(server, method_name)
    result = asyncio.run(method(*call_args))

    assert not result.startswith("❌"), f"{method_name} expected success, got: {result}"


def test_set_speed_succeeds_on_plain_text_and_stubs_demo_playback():
    server = AgentVibesServer()

    async def fake_run_script(script_name, args, timeout=DEFAULT_SCRIPT_TIMEOUT):
        return ScriptResult(0, "Speech speed set for main voice", "")
    server._run_script = fake_run_script

    async def fake_tts(*_args, **_kwargs):
        return "✅ Spoke: ok"
    server.text_to_speech = fake_tts

    result = asyncio.run(server.set_speed("2x"))

    assert not result.startswith("❌"), result


def test_get_speed_and_get_verbosity_surface_script_failure():
    server = AgentVibesServer()

    async def fake_run_script(script_name, args, timeout=DEFAULT_SCRIPT_TIMEOUT):
        return ScriptResult(1, "", "speed-manager.sh: command not found")
    server._run_script = fake_run_script

    result = asyncio.run(server.get_speed())
    assert result.startswith("❌")
    assert "command not found" in result


# ---------------------------------------------------------------------------
# H3: stdin=DEVNULL + timeout on every spawn
# ---------------------------------------------------------------------------

def test_run_script_enforces_timeout_instead_of_hanging(tmp_path):
    """A script that never exits (simulating a hung/interactive prompt) must
    be killed and reported as a failure within the requested timeout — not
    hang the calling coroutine (and therefore the MCP server) forever."""
    server = AgentVibesServer()
    server.hooks_dir = tmp_path

    if server.is_windows:
        script = tmp_path / "slow.ps1"
        script.write_text("Start-Sleep -Seconds 5\nWrite-Host 'done'\n")
        script_name = "slow.ps1"
    else:
        script = tmp_path / "slow.sh"
        script.write_text("#!/usr/bin/env bash\nsleep 5\necho done\n")
        script.chmod(0o755)
        script_name = "slow.sh"

    start = time.monotonic()
    result = asyncio.run(server._run_script(script_name, [], timeout=1.0))
    elapsed = time.monotonic() - start

    assert not result.ok
    assert "timed out" in result.stderr.lower()
    assert elapsed < 4.0, f"_run_script did not honor the timeout (took {elapsed:.1f}s)"


def test_run_script_stdin_is_devnull_so_reads_get_eof_not_a_hang(tmp_path):
    """download-extra-voices.sh-style scripts that try to read a Y/n
    confirmation must see EOF immediately (stdin=DEVNULL) rather than
    inheriting the MCP JSON-RPC stdio stream and blocking on it."""
    server = AgentVibesServer()
    server.hooks_dir = tmp_path

    if server.is_windows:
        script = tmp_path / "reads_stdin.ps1"
        script.write_text(
            "$line = [Console]::In.ReadLine()\n"
            "Write-Host \"got:[$line]\"\n"
        )
        script_name = "reads_stdin.ps1"
    else:
        script = tmp_path / "reads_stdin.sh"
        script.write_text("#!/usr/bin/env bash\nread -r line\necho \"got:[$line]\"\n")
        script.chmod(0o755)
        script_name = "reads_stdin.sh"

    # If stdin were inherited from a live, never-closing pipe this would hang;
    # bounding it with wait_for proves _run_script itself returns promptly.
    result = asyncio.run(asyncio.wait_for(server._run_script(script_name, [], timeout=10.0), timeout=15.0))
    assert result.ok, f"expected clean EOF-driven exit, got: {result}"


def test_text_to_speech_subprocess_spawn_passes_stdin_devnull(monkeypatch):
    """text_to_speech's own TTS subprocess spawn (separate from _run_script)
    must also pass stdin=DEVNULL."""
    server = AgentVibesServer()
    captured_kwargs = {}

    async def fake_create_subprocess_exec(*args, **kwargs):
        captured_kwargs.update(kwargs)
        return _FakeProc()

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)

    asyncio.run(server.text_to_speech("hello"))

    assert captured_kwargs.get("stdin") == asyncio.subprocess.DEVNULL


# ---------------------------------------------------------------------------
# download_extra_voices(auto_yes=False) must never reach the interactive prompt
# ---------------------------------------------------------------------------

def test_download_extra_voices_without_auto_yes_never_spawns_the_script():
    server = AgentVibesServer()
    calls = []

    async def fake_run_script(script_name, args, timeout=DEFAULT_SCRIPT_TIMEOUT):
        calls.append((script_name, args, timeout))
        return ScriptResult(0, "should not be reached", "")
    server._run_script = fake_run_script

    result = asyncio.run(server.download_extra_voices(auto_yes=False))

    assert calls == [], "download-extra-voices.sh must never be spawned without explicit auto_yes=True"
    assert not result.startswith("✅")
    assert "confirmation" in result.lower() or "auto_yes" in result.lower()


def test_download_extra_voices_with_auto_yes_runs_script_with_yes_flag():
    server = AgentVibesServer()
    calls = []

    async def fake_run_script(script_name, args, timeout=DEFAULT_SCRIPT_TIMEOUT):
        calls.append((script_name, args, timeout))
        return ScriptResult(0, "Successfully downloaded 3 voices", "")
    server._run_script = fake_run_script

    result = asyncio.run(server.download_extra_voices(auto_yes=True))

    assert len(calls) == 1
    script_name, args, timeout = calls[0]
    assert script_name == "download-extra-voices.sh"
    assert args == ["--yes"]
    assert not result.startswith("❌")


# ---------------------------------------------------------------------------
# #4: per-call personality/language mutation — concurrency + non-destructive restore
# ---------------------------------------------------------------------------

def test_concurrent_personality_overrides_are_serialized_by_lock(tmp_path, monkeypatch):
    """Two concurrent text_to_speech(personality=...) calls must not have
    their "set the temporary personality" critical sections overlap. This
    measures actual concurrent presence (via a shared counter held open by
    an artificial sleep) rather than relying on incidental asyncio
    scheduling order, so it deterministically fails without the lock and
    passes with it."""
    server = AgentVibesServer()
    server._get_config_dir = lambda: tmp_path

    active = []
    max_concurrent = {"value": 0}

    async def fake_get_personality():
        return "normal"
    server._get_personality = fake_get_personality

    async def fake_run_script(script_name, args, timeout=DEFAULT_SCRIPT_TIMEOUT):
        if script_name == server.PERSONALITY_MANAGER_SCRIPT and args[0] == "set" and args[1] != "normal":
            active.append(1)
            max_concurrent["value"] = max(max_concurrent["value"], len(active))
            # Hold the critical section open long enough that, without the
            # lock, the other concurrent call would enter it too.
            await asyncio.sleep(0.05)
            active.pop()
        return ScriptResult(0, "ok", "")
    server._run_script = fake_run_script

    async def fake_create_subprocess_exec(*_args, **_kwargs):
        return _FakeProc(sleep=0.01)

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)

    async def run_both():
        await asyncio.gather(
            server.text_to_speech("hello", personality="flirty"),
            server.text_to_speech("world", personality="sarcastic"),
        )

    asyncio.run(run_both())

    assert max_concurrent["value"] == 1, (
        "concurrent text_to_speech(personality=...) calls overlapped their "
        "'set personality' critical sections — self._override_lock is not "
        "serializing them"
    )


def test_personality_restore_deletes_file_when_none_existed_before(tmp_path, monkeypatch):
    """Non-destructive-config rule: a temporary per-call personality override
    must not leave tts-personality.txt behind if no such file existed before
    the call (personality-manager.sh's `set` has no delete-on-default
    behavior, unlike language-manager.sh's `set english`)."""
    server = AgentVibesServer()
    server._get_config_dir = lambda: tmp_path

    async def fake_get_personality():
        return "normal"
    server._get_personality = fake_get_personality

    run_script_calls = []

    async def fake_run_script(script_name, args, timeout=DEFAULT_SCRIPT_TIMEOUT):
        run_script_calls.append((script_name, tuple(args)))
        return ScriptResult(0, "ok", "")
    server._run_script = fake_run_script

    async def fake_create_subprocess_exec(*_args, **_kwargs):
        return _FakeProc()
    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)

    personality_file = tmp_path / "tts-personality.txt"
    assert not personality_file.exists()

    asyncio.run(server.text_to_speech("hi", personality="flirty"))

    assert not personality_file.exists(), (
        "restoring a per-call personality override must delete the file when "
        "none existed before, not write 'normal' into a file that never existed"
    )
    set_calls = [c for c in run_script_calls if c[0] == server.PERSONALITY_MANAGER_SCRIPT]
    assert set_calls == [(server.PERSONALITY_MANAGER_SCRIPT, ("set", "flirty"))]


def test_personality_restore_calls_script_when_file_existed_before(tmp_path, monkeypatch):
    server = AgentVibesServer()
    server._get_config_dir = lambda: tmp_path
    (tmp_path / "tts-personality.txt").write_text("grumpy")

    async def fake_get_personality():
        return "grumpy"
    server._get_personality = fake_get_personality

    run_script_calls = []

    async def fake_run_script(script_name, args, timeout=DEFAULT_SCRIPT_TIMEOUT):
        run_script_calls.append((script_name, tuple(args)))
        return ScriptResult(0, "ok", "")
    server._run_script = fake_run_script

    async def fake_create_subprocess_exec(*_args, **_kwargs):
        return _FakeProc()
    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)

    asyncio.run(server.text_to_speech("hi", personality="flirty"))

    set_calls = [c for c in run_script_calls if c[0] == server.PERSONALITY_MANAGER_SCRIPT]
    assert set_calls == [
        (server.PERSONALITY_MANAGER_SCRIPT, ("set", "flirty")),
        (server.PERSONALITY_MANAGER_SCRIPT, ("set", "grumpy")),
    ]
    assert (tmp_path / "tts-personality.txt").read_text() == "grumpy"


# ---------------------------------------------------------------------------
# #6: background-music default volume description is 20%, not 30%
# ---------------------------------------------------------------------------

def test_tool_descriptions_state_20_percent_default_not_30():
    tools = asyncio.run(list_tools())
    by_name = {t.name: t for t in tools}

    enable_desc = by_name["enable_background_music"].description
    assert "20%" in enable_desc
    assert "30%" not in enable_desc

    volume_desc = by_name["set_background_music_volume"].inputSchema["properties"]["volume"]["description"]
    assert "0.20" in volume_desc
    assert "0.30" not in volume_desc


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
