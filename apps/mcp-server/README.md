# @itzvenkat0/agentlens-mcp-server

An official [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for **AgentLens** — enabling AI agents to self-instrument, report their own activities, and log spans directly.

## What problem does this solve?

When building autonomous AI systems (like coding agents, researchers, or customer support bots), it is incredibly difficult to know exactly *what* the agent is doing at any given moment. Traditional observability requires developers to manually wrap every LLM call and function execution in their source code using an SDK. 

**This package flips that paradigm.** 

By providing AgentLens as an MCP server, you give the *AI agent itself* the tools it needs to self-report its own execution. The agent can natively call tools to say "I am starting to research a topic", then later "I finished researching and it took 45 seconds", and finally "Here is the result". All of this telemetry is pushed directly into your AgentLens dashboard.

## Features
- **Zero-Code Instrumentation**: No need to rewrite your application code with our SDK. If the agent supports MCP, it supports AgentLens.
- **Native Tool Access**: Provides `startSpan`, `endSpan`, and `logEvent` directly into the LLM's context window context.
- **Universal Compatibility**: Works with Claude Desktop, Cursor, Zed, and any custom MCP-client architecture.

---

## Installation

You can run the server directly via `npx` (recommended for desktop clients), or install it globally:

```bash
# Option 1: Run directly without installing permanently
npx -y @itzvenkat0/agentlens-mcp-server

# Option 2: Install globally on your machine
npm install -g @itzvenkat0/agentlens-mcp-server
```

---

## Examples & Configuration

To use the AgentLens MCP Server, you simply need to register it with your MCP Client of choice and pass the required environment variables.

### 1. Claude Desktop

To use this with Claude Desktop, add the following to your `claude_desktop_config.json` file (located in `~/Library/Application Support/Claude/` on Mac or `%APPDATA%\Claude\` on Windows):

```json
{
  "mcpServers": {
    "agentlens": {
      "command": "npx",
      "args": [
        "-y",
        "@itzvenkat0/agentlens-mcp-server"
      ],
      "env": {
        "AGENTLENS_API_URL": "http://localhost:9471/api/ingest",
        "AGENTLENS_PROJECT_KEY": "YOUR_PROJECT_KEY"
      }
    }
  }
}
```
*Note: Once configured, restart Claude Desktop. You will see a small hammer icon indicating the AgentLens tools are available.*

### 2. Cursor IDE

If you use Cursor as your AI code editor, you can add AgentLens to track Cursor's autonomous codebase edits natively.

1. Open Cursor Settings > **Features** > **MCP Servers**.
2. Click **+ Add new MCP server**.
3. Set the Type to `command`.
4. Set the Name to `AgentLens`.
5. Set the Command to:
   ```bash
   npx -y @itzvenkat0/agentlens-mcp-server
   ```
   *(Ensure you prefix the command with environment variables if your ingestion endpoint isn't local).*

### 3. Custom Node.js MCP Client

If you are building your own AI Agent in TypeScript/Node and using the `@modelcontextprotocol/sdk/client`, you can spin up the AgentLens server as a Stdio subprocess:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@itzvenkat0/agentlens-mcp-server"],
  env: {
    ...process.env,
    AGENTLENS_API_URL: "https://your-production-agentlens.com/api/ingest",
    AGENTLENS_PROJECT_KEY: "prod_key_123"
  }
});

const client = new Client(
  { name: "My Autonomous Agent", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

await client.connect(transport);
// The agent now has structural access to startSpan, endSpan, and logEvent!
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENTLENS_API_URL` | The REST ingestion endpoint for AgentLens. | `http://localhost:9471/api/ingest` |
| `AGENTLENS_PROJECT_KEY` | Authentication key generated from your AgentLens dashboard. | *Required* |

## License
MIT
