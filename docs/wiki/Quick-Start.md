# Quick Start

Get AgentLens running locally in under 5 minutes.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js 18+](https://nodejs.org/) (only for local development without Docker)

## Step 1: Clone and start

```bash
git clone https://github.com/itzvenkat/agentlens.git
cd agentlens
cp .env.example .env.development
docker compose up -d
```

This starts **5 services**: PostgreSQL, Redis, API (`:3000`), Dashboard (`:3001`), and LLM Proxy (`:4000`).

Wait about 30 seconds for everything to become healthy, then verify:

```bash
# Check all services are running
docker compose ps

# Check API health
curl http://localhost:3000/health

# Check proxy health
curl http://localhost:4000/health
```

## Step 2: Open the dashboard

Go to [http://localhost:3001](http://localhost:3001). You'll see the analytics dashboard (empty for now).

## Step 3: Create a project

Every agent or app gets its own project with a unique API key:

```bash
curl -X POST http://localhost:3000/v1/projects \
  -H "X-Master-Key: agentlens_master_dev_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-first-agent", "description": "Testing AgentLens"}'
```

The response looks like:

```json
{
  "id": "a1b2c3...",
  "name": "my-first-agent",
  "apiKey": "al_abc123..."
}
```

> ⚠️ **Save the `apiKey`** — it's only shown once. You'll need it for all integration methods.

## Step 4: Send your first telemetry

The quickest test — send a span directly via REST:

```bash
curl -X POST http://localhost:3000/v1/ingest \
  -H "X-API-Key: al_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "spans": [{
      "traceId": "test-trace-1",
      "spanId": "test-span-1",
      "type": "llm",
      "model": "gpt-4o",
      "inputTokens": 150,
      "outputTokens": 80,
      "durationMs": 1200,
      "status": "ok"
    }]
  }'
```

Now refresh the dashboard — you should see your first session! 🎉

## What's next?

Choose the integration method that fits your workflow:

- **[[LLM Proxy]]** — Point your desktop app (Claude, Cursor) at `localhost:4000`. Zero code.
- **[[SDK Guide]]** — Add 2 lines to your TypeScript agent for auto-instrumentation.
- **[[MCP Server]]** — Let MCP-compatible agents self-report via tools.
- **[[REST API]]** — Send telemetry from any language via HTTP.
