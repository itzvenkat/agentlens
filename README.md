<p align="center">
  <h1 align="center">🔍 AgentLens</h1>
  <p align="center">
    Observability and analytics for AI agents.<br/>
    See what your agents actually do — every LLM call, tool use, and token spent.
  </p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> •
    <a href="#how-to-integrate">Integrate</a> •
    <a href="#dashboard">Dashboard</a> •
    <a href="#api-reference">API</a> •
    <a href="#deploy">Deploy</a>
  </p>
</p>

---

**AgentLens** is a self-hosted observability platform for autonomous AI agents. Think of it as Datadog, but for agents — not servers.

It captures telemetry (LLM calls, tool usage, token consumption) and turns it into actionable insights:

- 📊 **Session traces** — See exactly what your agent did, step by step
- 🔁 **Loop detection** — Automatically detect when agents get stuck in repetitive cycles
- 💰 **Cost tracking** — Know how many tokens each session burns
- 🧠 **RL-powered insights** — Q-learning scores each tool based on real outcomes
- 📈 **Retention** — Track how often users return to agentic workflows

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  docker compose up                                            │
│                                                                │
│  ┌─────────┐  ┌─────────┐  ┌───────────┐  ┌──────────────┐   │
│  │ Postgres │  │  Redis  │  │    API    │  │  Dashboard   │   │
│  │  :5432   │  │  :6379  │  │   :9471   │  │    :9472     │   │
│  └─────────┘  └─────────┘  └─────┬─────┘  └──────────────┘   │
│                                   │                            │
│                            ┌──────┴──────┐                     │
│                            │  LLM Proxy  │                     │
│                            │    :9473    │                     │
│                            └─────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

| Service | Port | What it does |
|---------|------|-------------|
| **API** | 9471 | REST API — receives telemetry, serves analytics |
| **Dashboard** | 9472 | Next.js analytics UI |
| **LLM Proxy** | 9473 | Transparent proxy — auto-logs LLM calls from any client |
| **PostgreSQL** | 5432 | Data storage |
| **Redis** | 6379 | Job queues (BullMQ) |

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js 18+](https://nodejs.org/) (for local development)

### 1. Clone and start

```bash
git clone https://github.com/itzvenkat/agentlens.git
cd agentlens
cp .env.example .env.development
docker compose up -d
```

All 5 services start up. Wait ~30 seconds for everything to be healthy, then open:

- **Dashboard** → [http://localhost:9472](http://localhost:9472)
- **API** → [http://localhost:9471/health](http://localhost:9471/health)
- **Proxy** → [http://localhost:9473/health](http://localhost:9473/health)

### 2. Create a project

Every agent/app gets its own project with a unique API key:

```bash
curl -X POST http://localhost:9471/v1/projects \
  -H "X-Master-Key: agentlens_master_dev_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-first-agent", "description": "Testing AgentLens"}'
```

The response includes your API key (starts with `al_`). **Save it — it's only shown once.**

### 3. Start sending data

Pick the integration method that matches your setup:

## How to Integrate

AgentLens offers **four** ways to connect, from zero-code to full programmatic control:

| Method | Best for | Effort |
|--------|----------|--------|
| [LLM Proxy](#option-a-llm-proxy) | Desktop apps & IDEs (Claude, Cursor, ChatGPT) | Change 1 URL |
| [SDK](#option-b-sdk) | Custom agents, TypeScript/Node.js apps | 2 lines of code |
| [MCP Server](#option-c-mcp-server) | MCP-compatible tools (Claude Desktop, Copilot) | Edit 1 config file |
| [REST API](#option-d-rest-api) | Any language, direct HTTP | POST request |

---

### Option A: LLM Proxy

**Best for:** Desktop apps, IDEs, and anything where you can't modify code.

The proxy sits between your client and the LLM API. It forwards requests unchanged and silently logs telemetry to AgentLens.

**Step 1:** Add your API key to `.env.development`:

```env
AGENTLENS_API_KEY=al_your_key_here
```

**Step 2:** Restart the proxy:

```bash
docker compose up -d proxy
```

**Step 3:** Point your client to the proxy:

| Client | Where to change | Value |
|--------|----------------|-------|
| **Cursor** | Settings → Models → OpenAI Base URL | `http://localhost:9473/v1` |
| **Any OpenAI client** | Environment variable | `OPENAI_BASE_URL=http://localhost:9473/v1` |
| **Anthropic SDK** | Auto-detected from request headers | `ANTHROPIC_BASE_URL=http://localhost:9473` |
| **Ollama clients** | Set upstream to Ollama | `UPSTREAM_BASE_URL=http://localhost:11434` |

The proxy auto-detects the provider (OpenAI, Anthropic, Google, OpenRouter, Ollama) based on request headers and URL patterns.

> **How it works:** Client → `localhost:9473` → proxy logs the request → forwards to real API → returns response → logs the response.

---

### Option B: SDK

**Best for:** TypeScript/Node.js apps where you want fine-grained control.

```bash
npm install @agentlens/sdk
```

**OpenAI:**

```typescript
import OpenAI from 'openai';
import { AgentLensClient, wrapOpenAI } from '@agentlens/sdk';

const lens = new AgentLensClient({
  apiKey: 'al_your_key_here',
  endpoint: 'http://localhost:9471',
});

const openai = wrapOpenAI(lens, new OpenAI());

// That's it — all calls are now automatically traced
const result = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'What is 2+2?' }],
});
```

**Anthropic:**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { AgentLensClient, wrapAnthropic } from '@agentlens/sdk';

const lens = new AgentLensClient({ apiKey: 'al_...', endpoint: 'http://localhost:9471' });
const anthropic = wrapAnthropic(lens, new Anthropic());
```

**Vercel AI SDK:**

```typescript
import { generateText, streamText } from 'ai';
import { AgentLensClient, wrapVercelAI } from '@agentlens/sdk';

const lens = new AgentLensClient({ apiKey: 'al_...', endpoint: 'http://localhost:9471' });
const ai = wrapVercelAI(lens, { generateText, streamText });
```

**Generic (any provider via fetch):**

```typescript
import { AgentLensClient, wrapFetch } from '@agentlens/sdk';

const lens = new AgentLensClient({ apiKey: 'al_...', endpoint: 'http://localhost:9471' });
globalThis.fetch = wrapFetch(lens, globalThis.fetch);
// All subsequent fetch() calls to known LLM APIs are auto-traced
```

**Manual spans:**

```typescript
const trace = lens.trace('task-123');
const span = trace.span('tool', 'read_file');
// ... do work ...
span.end({ status: 'ok', toolName: 'read_file' });
await trace.end('success');
```

> See [`libs/sdk/README.md`](libs/sdk/README.md) for the full API reference.

---

### Option C: MCP Server

**Best for:** MCP-compatible agents (Claude Desktop, Copilot, Gemini CLI, Cursor).

Install globally:

```bash
npm install -g @agentlens/mcp-server
```

Then add to your MCP config:

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

The agent gets three tools: `report_progress`, `report_result`, and `report_error`.

**Config file locations:**

| Client | Config path |
|--------|------------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` in your project |
| Gemini CLI | `.gemini/settings.json` in your project |
| VS Code | `.vscode/mcp.json` in your project |

---

### Option D: REST API

**Best for:** Any language, any framework, full control.

```bash
curl -X POST http://localhost:9471/v1/ingest \
  -H "X-API-Key: al_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "spans": [{
      "traceId": "task-123",
      "spanId": "span-1",
      "type": "llm",
      "model": "gpt-4o",
      "inputTokens": 150,
      "outputTokens": 80,
      "durationMs": 1200,
      "status": "ok"
    }]
  }'
```

---

## Dashboard

Open [http://localhost:9472](http://localhost:9472) to see:

- **Overview** — KPIs, RL tool ratings, recent sessions
- **Sessions** — Filterable list with full trace data (expandable span trees)
- **Tool Efficiency** — Which tools help agents succeed vs. cause loops
- **Retention** — Daily agent activity and return rates

## API Reference

All endpoints require `X-API-Key` header except those marked as public.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/projects` | Create a project (requires `X-Master-Key`) |
| `POST` | `/v1/ingest` | Ingest a batch of spans |
| `POST` | `/v1/ingest/end-session` | End a session with final status |
| `GET` | `/v1/analytics/overview` | KPI summary |
| `GET` | `/v1/analytics/sessions` | Paginated session list |
| `GET` | `/v1/analytics/sessions/:id/trace` | Span waterfall for a session |
| `GET` | `/v1/analytics/tools` | Tool efficiency metrics |
| `GET` | `/v1/analytics/retention` | Retention data |
| `GET` | `/v1/analytics/rl-insights` | RL Q-value tool rankings |
| `GET` | `/v1/analytics/stream` | SSE real-time updates |
| `GET` | `/health` | Health check (public) |

## Configuration

Copy `.env.example` to `.env.development` and edit:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `9471` | API server port |
| `DB_HOST` | `postgres` | PostgreSQL host |
| `DB_PASSWORD` | — | Database password |
| `REDIS_HOST` | `redis` | Redis host |
| `MASTER_API_KEY` | — | Master key for creating projects |
| `APP_CORS_ORIGINS` | `http://localhost:9472` | Allowed CORS origins |
| `AGENTLENS_API_KEY` | — | API key for the LLM proxy |
| `PROXY_PORT` | `9473` | LLM proxy port |
| `UPSTREAM_BASE_URL` | `https://api.openai.com` | Default upstream LLM API |
| `DASHBOARD_PORT` | `9472` | Dashboard port |
| `LOOP_DETECTION_THRESHOLD` | `3` | Duplicate tool calls before flagging a loop |

## Deploy

### Docker (recommended)

```bash
# Production
cp .env.example .env.production
# Edit .env.production with real credentials

NODE_ENV=production docker compose up -d
```

### Local Development

```bash
# Install everything
npm install --legacy-peer-deps
cd dashboard && npm install && cd ..

# Start only infrastructure
docker compose up -d postgres redis

# Start API with hot reload
npm run start:api:dev

# Start dashboard (separate terminal)
cd dashboard && npm run dev

# Start proxy (separate terminal)
npm run start:proxy
```

### Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start all services |
| `docker compose down` | Stop all services |
| `docker compose logs -f` | Follow all logs |
| `npm run build:all` | Build everything |
| `npm run start:api:dev` | API with hot reload |
| `npm run start:proxy` | Start proxy server |
| `npm run build:proxy` | Build proxy |
| `npm test` | Run tests |
| `npm run lint` | Lint code |
| `npm run format` | Format code |

## Project Structure

```
agentlens/
├── apps/
│   ├── api/                    # NestJS REST API
│   │   └── src/
│   │       ├── auth/           # API key auth, project management
│   │       ├── ingest/         # Telemetry ingestion, PII scrubbing
│   │       ├── analytics/      # Queries, aggregations, SSE
│   │       ├── processor/      # Loop detection, RL engine, daily aggregation
│   │       └── config/         # Multi-env config with Joi validation
│   ├── mcp-server/             # MCP server (stdio transport)
│   └── proxy/                  # Transparent LLM Proxy
├── libs/
│   ├── common/                 # Shared entities, DTOs, constants
│   └── sdk/                    # TypeScript SDK (@agentlens/sdk)
│       ├── client.ts           # Core client (batching, flush, PII)
│       ├── trace.ts            # Trace + Span classes
│       └── wrappers/           # OpenAI, Anthropic, Vercel AI, fetch
├── dashboard/                  # Next.js 15 analytics dashboard
├── docker/                     # Dockerfiles, init SQL
├── .github/workflows/          # CI + npm publish
├── .env.example                # Config template
└── docker-compose.yml          # Full stack (one command)
```

## How the RL Engine Works

AgentLens learns from session outcomes using Q-learning:

1. **Reward signal** — Each completed session gets a score based on:
   - Success/failure (+1.0 / −0.5)
   - Token efficiency (budget usage)
   - Loop penalty (−0.3 per detected loop)
   - Speed bonus (faster = higher)

2. **Q-value updates** — Each tool's Q-value is updated incrementally:
   ```
   Q(tool) = Q(tool) + α × (reward - Q(tool))
   ```
   Tools closer to the outcome get more credit (γ = 0.95).

3. **Dashboard insights** — Q-values surface as ranked tool recommendations, showing which tools to keep, improve, or deprecate.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS 11, TypeORM, PostgreSQL 16 |
| Queue | BullMQ, Redis 7 |
| Dashboard | Next.js 15, React 19 |
| SDK | TypeScript, zero dependencies |
| MCP | @modelcontextprotocol/sdk |
| Proxy | Pure Node.js HTTP, zero dependencies |
| Containers | Docker, multi-stage Alpine builds |

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| `@agentlens/sdk` | [npm](https://www.npmjs.com/package/@agentlens/sdk) | SDK with auto-instrumentation wrappers |
| `@agentlens/mcp-server` | [npm](https://www.npmjs.com/package/@agentlens/mcp-server) | MCP server for agent self-instrumentation |

## License

[MIT](LICENSE)
