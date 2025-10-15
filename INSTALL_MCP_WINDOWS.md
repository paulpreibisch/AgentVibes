# Install MCP Package on Windows

## Issue Found

The MCP server logs show:
```
ModuleNotFoundError: No module named 'mcp'
```

This means Windows Python doesn't have the `mcp` package installed.

## Solution

Open **PowerShell** or **Command Prompt** as Administrator and run:

```powershell
pip install mcp
```

Or if you have multiple Python versions:

```powershell
python -m pip install mcp
```

## Verify Installation

```powershell
python -c "import mcp; print('MCP installed successfully!')"
```

## After Installation

1. **Restart Claude Desktop** completely
2. The AgentVibes MCP server should now work!

## Test in Claude Desktop

Once restarted, try:
- "What AgentVibes tools do you have?"
- "Use text to speech to say hello"

## Configuration Summary

Your Claude Desktop config is now set to:
- **Server:** `C:\Users\Paul\AgentVibes\mcp-server\server.py`
- **Python:** Windows Python (the one in your PATH)
- **Provider:** Piper TTS (free, offline - no API key needed)

## Troubleshooting

If it still doesn't work after installing `mcp`:

1. **Check Python version:**
   ```powershell
   python --version
   ```
   Should be Python 3.10 or higher

2. **Check pip:**
   ```powershell
   pip --version
   ```

3. **Try explicit install:**
   ```powershell
   C:\Users\Paul\AppData\Local\Programs\Python\Python312\python.exe -m pip install mcp
   ```

4. **Check logs again:**
   View: `C:\Users\Paul\AppData\Roaming\Claude\logs\mcp-server-agentvibes.log`

---

🎤 **Ready to make Claude Desktop speak!**
