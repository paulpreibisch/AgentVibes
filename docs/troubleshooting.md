# Troubleshooting

## No Audio Playing?

2. Check output style: `/output-style agent-vibes`
3. Test playback: `/agent-vibes:sample Aria`

## Commands Not Found?

```bash
# Verify installation
npx agentvibes status

# Reinstall
npx agentvibes install --yes
```

## Wrong Voice Playing?

```bash
# Check current setup
/agent-vibes:whoami

# Reset if needed
/agent-vibes:personality reset
/agent-vibes:sentiment clear
```

## MCP Not Working?

1. **Check config file**: Verify JSON syntax in `claude_desktop_config.json` or `.mcp-minimal.json`
2. **Restart app**: Close and reopen Claude Desktop/Warp/Claude Code
3. **Check logs**: Look for MCP connection errors in app logs
4. **Verify npx**: Run `npx -y agentvibes-mcp-server` manually to test

---

[↑ Back to Main README](../README.md)
