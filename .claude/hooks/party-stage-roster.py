#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Broadcast a BMAD party's cast to an AgentVibes receiver (best-effort doorbell).

A receiver normally learns an avatar only when it speaks (one /speak event per
line). This doorbell stages the WHOLE cast up front: it resolves the active
party roster (via BMAD's read-only ``resolve_party.py``), joins each member to
its saved voice/avatar, and POSTs the result to a receiver's ``/stage-roster``
endpoint keyed by the SESSION id. Any receiver that implements ``/stage-roster``
can then paint the labelled, voiced cast at once; a receiver that doesn't (or a
down/absent one) simply never hears the doorbell and the party runs unchanged.

Session key
-----------
The broadcast is keyed by the canonical routing SESSION id -- ``basename`` of
``CLAUDE_PROJECT_DIR`` (falling back to ``--project-root``), slugified the same
way ``.claude/hooks/session-id.sh :: av_session_id`` slugifies it -- plus the
``--session-suffix`` (default ``bmad-party-mode``). The suffix stages the party
on its OWN session, distinct from the plain-TTS session for the same project.

Open-cast vs fixed-cast (the forward-compat contract)
-----------------------------------------------------
  * Fixed-cast (members present): POST
      {"session","project","roster":[{name,agentId,voice,role?,avatarId?}]}
  * Open-cast (resolve_party sets ``open_cast`` when a room lists no fixed
    members, only a freeform ``scene`` theme): POST
      {"session","project","roster":[...anchors if any...],
       "openCast":true,"room":{"id","name","scene"}}
    so a future receiver can cast avatars / dress a scene from the theme text.
    (The private prototype SKIPPED open-cast; we broadcast it -- that is the
    headline forward-compat behavior this doorbell ships.)

``project`` is sent as a back-compat alias of ``session`` (current receivers key
on ``project``).

Best-effort contract
--------------------
Stdlib only (urllib). Any failure -- resolver error, connection refused, 404,
timeout -- prints a benign note to stderr and returns 0. A down or absent
receiver must NEVER block or fail the party.

  party-stage-roster.py --project-root P [--skill S] [--party ID]
                        [--session-suffix bmad-party-mode] [--url http://127.0.0.1:3747]
"""

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.request
import urllib.error
from pathlib import Path


def _resolve_roster(project_root: Path, skill_root: Path, party):
    """Run BMAD's resolve_party.py (READ-ONLY) and return its parsed JSON, or None."""
    script = skill_root / "scripts" / "resolve_party.py"
    cmd = [sys.executable, str(script), "--project-root", str(project_root), "--skill", str(skill_root)]
    if party:
        cmd += ["--party", party]
    try:
        # encoding+errors are REQUIRED on Windows: text=True defaults to cp1252,
        # which crashes on the non-Latin icon bytes the resolver can emit.
        # PYTHONUTF8 forces the child to write UTF-8 rather than crash.
        child_env = {**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}
        out = subprocess.run(cmd, capture_output=True, text=True,
                             encoding="utf-8", errors="replace",
                             env=child_env, timeout=60)
    except (OSError, subprocess.SubprocessError) as e:
        sys.stderr.write(f"stage-roster: resolve_party failed to run: {e}\n")
        return None
    if out.returncode != 0 or not out.stdout.strip():
        sys.stderr.write("stage-roster: resolve_party returned nothing usable\n")
        return None
    try:
        return json.loads(out.stdout)
    except json.JSONDecodeError:
        sys.stderr.write("stage-roster: resolve_party output was not JSON\n")
        return None


def _home_dir() -> Path:
    """User home, resilient to the launch environment.

    os.path.expanduser("~") returns "~" unchanged when USERPROFILE and
    HOMEDRIVE/HOMEPATH are all unset -- which is exactly the env some launchers
    hand these scripts. Check the vars actually present, Windows-then-POSIX.
    """
    for var in ("USERPROFILE", "HOME"):
        v = os.environ.get(var)
        if v:
            return Path(v)
    hd, hp = os.environ.get("HOMEDRIVE"), os.environ.get("HOMEPATH")
    if hd and hp:
        return Path(hd + hp)
    return Path(os.path.expanduser("~"))


def _find_skill_root(project_root: Path):
    """Locate the installed bmad-party-mode skill dir (project-local, else global).

    Returns a Path whose scripts/resolve_party.py exists, or None.
    """
    candidates = [
        project_root / ".claude" / "skills" / "bmad-party-mode",
        _home_dir() / ".claude" / "skills" / "bmad-party-mode",
    ]
    for c in candidates:
        if (c / "scripts" / "resolve_party.py").exists():
            return c
    return None


def _load_json_map(name: str) -> dict:
    """Read a ~/.agentvibes/<name> JSON map. {} if absent or unreadable."""
    path = _home_dir() / ".agentvibes" / name
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _voice_for(code: str, vmap: dict) -> str:
    """Saved voice string for an agent code, or '' if none.

    Prefers the richer agents[code].voice; falls back to the flat
    voiceMap[code] (older shape). Both key by the canonical agent code.
    """
    agents = vmap.get("agents") or {}
    entry = agents.get(code)
    if isinstance(entry, dict) and entry.get("voice"):
        return str(entry["voice"])
    flat = vmap.get("voiceMap") or {}
    if isinstance(flat.get(code), str):
        return flat[code]
    return ""


def _avatar_for(code: str, vmap: dict, amap: dict) -> str:
    """Saved avatarId for an agent code, or '' if none.

    The dedicated avatar map wins; the voice map's agents[id].avatarId is a
    legacy fallback (honoured if present).
    """
    ag = (amap.get("agents") or {}) if isinstance(amap, dict) else {}
    entry = ag.get(code)
    if isinstance(entry, dict) and entry.get("avatarId"):
        return str(entry["avatarId"])
    agents = vmap.get("agents") or {}
    ventry = agents.get(code)
    if isinstance(ventry, dict) and ventry.get("avatarId"):
        return str(ventry["avatarId"])
    return ""


def _session_key(project_root: Path) -> str:
    """Canonical routing SESSION id -- the same one the TTS forward paths send.

    Mirrors .claude/hooks/session-id.sh :: av_session_id: basename of
    CLAUDE_PROJECT_DIR (the real user project) when set, else --project-root,
    slugified so the id is a safe JSON string and a stable receiver map key.
    """
    cpd = os.environ.get("CLAUDE_PROJECT_DIR", "").strip()
    base = Path(cpd) if cpd else project_root
    name = base.name or "unknown"
    # Slugify to match av_session_id: collapse anything outside [A-Za-z0-9._-]
    # to '-', then trim leading/trailing dashes.
    name = re.sub(r"[^A-Za-z0-9._-]", "-", name).strip("-")
    return name or "unknown"


def _active_party(session_key: str, explicit):
    """Resolve which room to stage.

    Explicit --party wins. Otherwise read the AgentVibes-side active-room state
    file ~/.agentvibes/party-active-<sessionid>.json = {"group": "<id>"} (written
    by party-set-room.sh). If neither is present, return None so the DEFAULT
    party resolves (the common installed-agent room).
    """
    if explicit:
        return explicit
    path = _home_dir() / ".agentvibes" / f"party-active-{session_key}.json"
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    if isinstance(data, dict):
        group = data.get("group")
        if isinstance(group, str) and group.strip():
            return group.strip()
    return None


def build_roster(resolved: dict, vmap: dict, amap: dict):
    """Join resolver members to voices/avatars. Returns (roster, skipped_names)."""
    members = resolved.get("members") or []
    roster, skipped = [], []
    for m in members:
        code = m.get("code") or ""
        name = m.get("name") or code or "Agent"
        voice = _voice_for(code, vmap)
        if not voice:
            # Without a voice string the member can't key-match a later /speak
            # event, so staging it would orphan an avatar -- skip it.
            skipped.append(name)
            continue
        member = {"name": name, "agentId": code, "voice": voice}
        title = (m.get("title") or "").strip()
        if title:
            member["role"] = title
        avatar = _avatar_for(code, vmap, amap)
        if avatar:
            member["avatarId"] = avatar
        roster.append(member)
    return roster, skipped


def post_payload(url: str, payload: dict):
    """POST the payload to /stage-roster. Returns (ok, message)."""
    body = json.dumps(payload).encode("utf-8")
    base = url.rstrip("/")
    req = urllib.request.Request(
        base + "/stage-roster",
        data=body,
        headers={"Content-Type": "application/json", "Origin": base},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return True, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:200]}"
    except (urllib.error.URLError, OSError) as e:
        # Receiver not running / unreachable -- benign; the party runs regardless.
        return False, f"could not reach receiver ({e}); is a receiver up?"


def _default_url() -> str:
    port = (os.environ.get("AGENTVIBES_TH_PORT")
            or os.environ.get("TALKING_HEAD_PORT")
            or "3747").strip()
    if not port.isdigit():
        port = "3747"
    return f"http://127.0.0.1:{port}"


def main() -> int:
    ap = argparse.ArgumentParser(description="Broadcast a BMAD party cast to an AgentVibes receiver.")
    ap.add_argument("--project-root", required=True)
    ap.add_argument("--skill", default=None,
                    help="Path to the bmad-party-mode skill dir (auto-located if omitted)")
    ap.add_argument("--party", default=None, help="Explicit group id (wins over the active-room file)")
    ap.add_argument("--session-suffix", "--coin-suffix", dest="session_suffix",
                    default="bmad-party-mode",
                    help="Append '-<suffix>' to the session key so the party stages on its "
                         "OWN session (default: bmad-party-mode).")
    ap.add_argument("--url", default=None)
    args = ap.parse_args()

    project_root = Path(args.project_root).resolve()

    skill_root = Path(args.skill).resolve() if args.skill else _find_skill_root(project_root)
    if skill_root is None:
        sys.stderr.write("stage-roster: bmad-party-mode skill not found -- nothing to stage.\n")
        return 0

    session = _session_key(project_root)
    party = _active_party(session, args.party)

    resolved = _resolve_roster(project_root, skill_root, party)
    if resolved is None:
        return 0  # resolver failure already warned; never break the party

    suffix = (args.session_suffix or "").strip().strip("-")
    session_key = f"{session}-{suffix}" if suffix else session

    vmap = _load_json_map("bmad-voice-map.json")
    amap = _load_json_map("bmad-avatar-map.json")
    roster, skipped = build_roster(resolved, vmap, amap)
    if skipped:
        sys.stderr.write(f"stage-roster: skipped (no saved voice): {', '.join(skipped)}\n")

    open_cast = bool(resolved.get("open_cast"))

    if open_cast:
        # KEY DIFFERENCE from the private prototype: broadcast open-cast, don't
        # skip. A receiver can cast avatars / dress a scene from the theme text.
        room = {"id": resolved.get("active", ""), "name": resolved.get("name", "")}
        scene = resolved.get("scene")
        if scene:
            room["scene"] = scene
        payload = {"session": session_key, "project": session_key,
                   "roster": roster, "openCast": True, "room": room}
    else:
        if not roster:
            sys.stderr.write("stage-roster: no members had a saved voice -- nothing to stage.\n")
            return 0
        payload = {"session": session_key, "project": session_key, "roster": roster}

    # Test hook: capture the exact payload to a file instead of hitting the
    # network, so the hermetic bats suite can assert the wire shape.
    capture = os.environ.get("AGENTVIBES_STAGE_CAPTURE", "").strip()
    if capture:
        try:
            Path(capture).write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        except OSError as e:
            sys.stderr.write(f"stage-roster: could not write capture file: {e}\n")
        print(f"stage-roster: captured payload for '{session_key}' -> {capture}")
        return 0

    url = args.url or _default_url()
    ok, msg = post_payload(url, payload)
    kind = "open-cast" if open_cast else f"{len(roster)} member(s)"
    if ok:
        print(f"stage-roster: staged {kind} for '{session_key}' -> {msg.strip()}")
    else:
        print(f"stage-roster: {msg}")
    return 0  # benign: a down receiver must never block the party


if __name__ == "__main__":
    sys.exit(main())
