# MCP Server

The AgentLens MCP (Model Context Protocol) server lets MCP-compatible agents self-report their activities using standard MCP tools.

**Best for:** Claude Desktop, Cursor, Copilot, Gemini CLI, and other MCP-compatible clients.

## How it works

The MCP server exposes three tools that agents can call to report what they're doing:

| Tool | Purpose |
|------|---------|
| `report_progress` | Report an in-progress step (tool call, thinking, etc.) |
| `report_result` | Report a completed task with its outcome |
| `report_error` | Report a failure with error details |

The agent decides when to call these tools — they appear alongside its other tools.

## Install

### Option A: npm (global)

```bash
npm install -g @agentlens/mcp-server
```

### Option B: From source

```bash
git clone https://github.com/itzvenkat/agentlens.git
cd agentlens
npm install --legacy-peer-deps
npm run build:mcp
```

## Configure your client

Add to your MCP configuration file:

### Claude Desktop

File: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agentlens": {
      "command": "agentlens-mcp",
      "env": {
        "AGENTLENS_API_URL": "http://localhost:9471",
        "AGENTLENS_API_KEY": "al_your_key_here"
      }
    }
  }
}
```

### Cursor

File: `.cursor/mcp.json` (in your project root)

```json
{
  "mcpServers": {
    "agentlens": {
      "command": "agentlens-mcp",
      "env": {
        "AGENTLENS_API_URL": "http://localhost:9471",
        "AGENTLENS_API_KEY": "al_your_key_here"
      }
    }
  }
}
```

### Gemini CLI

File: `.gemini/settings.json` (in your project root)

```json
{
  "mcpServers": {
    "agentlens": {
      "command": "node",
      "args": ["path/to/agentlens/dist/apps/mcp-server/main.js"],
      "env": {
        "AGENTLENS_API_URL": "http://localhost:9471",
        "AGENTLENS_API_KEY": "al_your_key_here"
      }
    }
  }
}
```

### VS Code

File: `.vscode/mcp.json` (in your project root)

```json
{
  "servers": {
    "agentlens": {
      "command": "agentlens-mcp",
      "env": {
        "AGENTLENS_API_URL": "http://localhost:9471",
        "AGENTLENS_API_KEY": "al_your_key_here"
      }
    }
  }
}
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENTLENS_API_URL` | `http://localhost:9471` | AgentLens API endpoint |
| `AGENTLENS_API_KEY` | — | Your project's API key |

## Important note

MCP tools are **passive** — the agent must choose to call them. The agent's system prompt or tool descriptions influence how often it self-reports. For **automatic** instrumentation without agent cooperation, use the [[LLM Proxy]] or [[SDK Guide]] instead.
