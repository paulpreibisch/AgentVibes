---
description: Open the AgentVibes HTML Receiver — a galaxy avatar stage that speaks incoming AgentVibes TTS
---

# AgentVibes HTML Meeting

Open the **AgentVibes HTML Receiver** window locally so incoming AgentVibes TTS is spoken by talking-head avatars on a galaxy stage.

Do this:

1. Launch the dedicated Chrome app window (autoplay enabled) pointed at the receiver:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "C:\Users\Paul\.agentvibes\talking-head\open-cosmic.ps1" meeting
   ```

   The launcher auto-starts the talking-head server (`http://localhost:3747`) if it isn't already running.

2. Confirm it connected (top-right brand dot turns green):

   ```powershell
   (Invoke-WebRequest "http://localhost:3747/has-browser" -UseBasicParsing -TimeoutSec 5).Content
   ```

3. Tell the user it's open and ready. Notes for the user:
   - The window's top-right reads **AgentVibes HTML Receiver**.
   - Left panel = **Sessions** (tabs, grouped by project/cast) + **Chat** + a **Clear** button.
   - Each avatar is labeled with its **name** and **project**.
   - Real AgentVibes messages drive the avatars live; a message from a different project shows up as a new **tab with an unread badge**.
   - **Clear** empties the active session's avatars + chat; new incoming messages re-populate it.

If the user passes an argument (e.g. `partydemo`, `party`, `regular`, `opencast`, `gallery`), pass it through to the launcher instead of `meeting`.
