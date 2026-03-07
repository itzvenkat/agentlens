# AgentLens

Observability and analytics for autonomous AI agents. Track how agents use tools, where they loop, what they cost, and how to make them better.

> Think of it as Datadog, but for agents — not servers.

## What it does

AgentLens sits between your agents and the tools they use. It captures telemetry (spans, tool calls, token usage) and turns it into actionable insights:

- **Success vs. token burn** — Did the agent solve the problem, or just burn through your budget?
- **Tool efficiency** — Which tools help agents succeed and which lead to loops?
- **Loop detection** — Automatic detection of hallucination loops and repetitive tool calls
- **RL-powered optimization** — Q-learning scores each tool based on real session outcomes, surfaces recommendations
- **Retention tracking** — How often do users return to agentic workflows?

## Architecture

```
┌───────────────┐     ┌──────────────┐     ┌───────────────┐
│  Your Agent   │────▶│  AgentLens   │────▶│   Dashboard   │
│  (SDK / MCP)  │     │   API        │     │   (Next.js)   │
└───────────────┘     └──────┬───────┘     └───────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
               PostgreSQL 16     Redis 7
               (persistence)     (queues)
```

**Three ways to integrate:**

| Method | Best for | Setup time |
|--------|----------|------------|
| **SDK** (`@agentlens/sdk`) | Custom agents, OpenAI/Anthropic wrappers | ~5 lines of code |
| **MCP Server** | Any MCP-compatible agent (Claude, Copilot, etc.) | Config file change |
| **REST API** | Direct HTTP integration | POST to `/v1/ingest` |

## Quick start

### Docker (recommended)

The fastest way to get everything running:

```bash
git clone https://github.com/your-username/agentlens.git
cd agentlens
cp .env.example .env.development
docker compose up -d
```

That's it. Four services start up:

| Service | URL | What it does |
|---------|-----|-------------|
| **Dashboard** | [localhost:3001](http://localhost:3001) | Analytics UI |
| **API** | [localhost:3000](http://localhost:3000) | REST API |
| **PostgreSQL** | localhost:5432 | Data storage |
| **Redis** | localhost:6379 | Job queues |

The API waits for Postgres and Redis to be healthy before starting. The dashboard waits for the API. Everything has health checks.

### Local development

If you want to work on the code:

```bash
# Install dependencies
npm install --legacy-peer-deps
cd dashboard && npm install && cd ..

# Start infrastructure
docker compose up -d postgres redis

# Start API (with hot reload)
npm run start:api:dev

# Start dashboard (separate terminal)
cd dashboard && npm run dev
```

## Usage

### 1. Create a project and get an API key

```bash
curl -X POST http://localhost:3000/v1/auth/projects \
  -H "X-Master-Key: agentlens_master_dev_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent", "description": "My first agent"}'
```

The response includes your API key (starts with `al_`). Save it — it's only shown once.

### 2. Send telemetry

**Option A: SDK**

```typescript
import { AgentLensClient } from '@agentlens/sdk';

const lens = new AgentLensClient({
  apiKey: 'al_your_key_here',
  endpoint: 'http://localhost:3000',
});

// Wrap your OpenAI client — calls are automatically traced
const openai = lens.wrapOpenAI(new OpenAI());

// Or record spans manually
lens.record({
  traceId: 'task-123',
  spanId: 'span-1',
  type: 'tool',
  toolName: 'read_file',
  durationMs: 45,
  status: 'ok',
});

// Flush on shutdown
await lens.shutdown();
```

**Option B: MCP Server**

Add to your MCP config (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "agentlens": {
      "command": "node",
      "args": ["path/to/agentlens/dist/apps/mcp-server/main.js"],
      "env": {
        "AGENTLENS_API_URL": "http://localhost:3000",
        "AGENTLENS_API_KEY": "al_your_key_here"
      }
    }
  }
}
```

The agent can then call `report_progress`, `report_result`, and `report_error` tools to self-instrument.

**Option C: REST API**

```bash
curl -X POST http://localhost:3000/v1/ingest \
  -H "X-API-Key: al_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "spans": [{
      "traceId": "task-123",
      "spanId": "span-1",
      "type": "llm",
      "name": "chat.completions",
      "model": "gpt-4o",
      "inputTokens": 150,
      "outputTokens": 80,
      "durationMs": 1200,
      "status": "ok"
    }]
  }'
```

### 3. View the dashboard

Open [localhost:3001](http://localhost:3001). You'll see:

- **Overview** — KPIs, RL tool insights, recent sessions
- **Sessions** — Filterable list of all agent invocations with trace data
- **Tool Efficiency** — Heatmap showing which tools are helping vs. hurting
- **Retention** — Daily agent activity and return rates

## API reference

All endpoints require the `X-API-Key` header except those marked as public.

| Method | Endpoint | Description |
|--------|----------|-------------|
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

AgentLens uses environment-specific config files. Copy `.env.example` and adjust:

```
.env.development   # Local development (Docker service names as hosts)
.env.staging        # Staging environment
.env.production     # Production (stricter logging, SSL)
```

Key settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `3000` | API server port |
| `DB_HOST` | `postgres` | PostgreSQL host |
| `DB_PASSWORD` | — | Database password |
| `REDIS_HOST` | `redis` | Redis host |
| `APP_CORS_ORIGINS` | `http://localhost:3001` | Allowed CORS origins |
| `PROCESSOR_LOOP_THRESHOLD` | `3` | Duplicate tool calls before flagging a loop |
| `AUTH_MASTER_KEY` | — | Master key for creating projects |

## Project structure

```
agentlens/
├── apps/
│   ├── api/src/                # NestJS API
│   │   ├── auth/               # API key auth, project management
│   │   ├── ingest/             # Telemetry ingestion, PII scrubbing
│   │   ├── analytics/          # Queries, aggregations, SSE
│   │   ├── processor/          # Loop detection, RL reward, aggregation
│   │   ├── health/             # Health checks
│   │   └── config/             # Multi-env config with Joi validation
│   └── mcp-server/src/         # MCP server (stdio transport)
├── libs/
│   ├── common/src/             # Shared entities, DTOs, constants
│   └── sdk/src/                # TypeScript SDK
├── dashboard/src/              # Next.js 15 dashboard
│   ├── app/                    # Pages (overview, sessions, tools, retention)
│   ├── components/             # Shared UI components
│   └── lib/                    # API client
├── docker/                     # Dockerfiles, init SQL
├── .env.example                # Config template
├── .env.development            # Dev defaults
├── docker-compose.yml          # Full stack (one command)
└── nest-cli.json               # NestJS monorepo config
```

## How the RL engine works

Instead of just tracking metrics, AgentLens learns from session outcomes using Q-learning:

1. **Reward signal** — Each completed session produces a reward based on:
   - Success/failure (+1.0 / -0.5)
   - Token efficiency (how much of the budget was used)
   - Loop penalty (-0.3 per detected loop)
   - Speed bonus (faster completions score higher)

2. **Q-value updates** — Each tool's Q-value is updated incrementally:
   ```
   Q(tool) = Q(tool) + α × (reward - Q(tool))
   ```
   Tools used closer to the outcome get more credit (temporal discount γ = 0.95).

3. **Dashboard insights** — The Q-table surfaces as ranked tool recommendations, helping you understand which tools to keep, improve, or deprecate.

## Tech stack

| Layer | Technology |
|-------|-----------|
| API | NestJS 11, TypeORM, PostgreSQL 16 |
| Queue | BullMQ, Redis 7 |
| Dashboard | Next.js 15, React 19 |
| MCP | @modelcontextprotocol/sdk |
| Containers | Docker, multi-stage Alpine builds |

## License

MIT
