# AgentLens — Project Context

> This file provides complete project context for AI coding assistants.

## What is AgentLens?

AgentLens is a **self-hosted observability platform for AI agents**. It captures telemetry (LLM calls, tool usage, token consumption) from autonomous agents and surfaces actionable analytics through a dashboard. It includes a reinforcement learning engine that scores tool effectiveness based on session outcomes.

**Tagline:** "Datadog, but for AI agents."

## Architecture

5 services, all run via `docker compose up`:

| Service | Port | Technology | Source |
|---------|------|-----------|--------|
| API | 9471 | NestJS 11, TypeORM, PostgreSQL 16, BullMQ/Redis | `apps/api/` |
| Dashboard | 9472 | Next.js 15, React 19 | `dashboard/` |
| LLM Proxy | 9473 | Pure Node.js HTTP (zero deps) | `apps/proxy/` |
| PostgreSQL | 5432 | postgres:16-alpine | Docker image |
| Redis | 6379 | redis:7-alpine | Docker image |

## Data Flow

```
Client (SDK/Proxy/MCP/REST)
    → POST /v1/ingest { spans: [...] }
    → IngestController (PII scrubbing interceptor)
    → IngestService (resolve/create session, save spans + tool_calls)
    → BullMQ queue → ProcessorService (loop detection, RL reward, daily aggregation)
    → Dashboard reads via /v1/analytics/* endpoints
```

## Database Schema (PostgreSQL)

**Tables:** `projects`, `agent_sessions`, `spans`, `tool_calls`, `events`, `daily_aggregates`

Key relationships:
- `projects` 1:N `agent_sessions` (via `project_id`)
- `agent_sessions` 1:N `spans` (via `session_id`)
- `spans` 1:N `tool_calls` (via `span_id`)
- `agent_sessions` 1:N `events` (via `session_id`)
- `projects` + `date` → `daily_aggregates` (composite PK)

Schema defined in `docker/init.sql`. TypeORM entities in `libs/common/src/entities/`.

## Source Code Map

### `apps/api/src/` — NestJS REST API

| Module | Files | Purpose |
|--------|-------|---------|
| `auth/` | controller, service, guard, decorator | API key auth (`X-API-Key`), project CRUD (`X-Master-Key`) |
| `ingest/` | controller, service, interceptor | `POST /v1/ingest` — batch span ingestion, PII scrubbing |
| `analytics/` | controller, service | `GET /v1/analytics/*` — overview, sessions, tools, retention, RL insights, SSE |
| `processor/` | service, module | BullMQ consumers — loop detection, RL Q-value updates, daily aggregation |
| `health/` | controller | `GET /health` |
| `config/` | module, data-source | Environment config with Joi validation, TypeORM data source |

### `apps/proxy/src/main.ts` — LLM Proxy (single file)

Transparent HTTP proxy. Key internals:
- `PROVIDERS` object — per-provider config (upstream URL, token extraction, tool call detection)
- `detectProvider()` — checks request headers (`anthropic-version`, `x-agentlens-provider`, default OpenAI)
- `handleRequest()` — forwards to upstream, reads response, extracts telemetry, buffers spans
- `flushToAgentLens()` — periodic batch POST to `/v1/ingest`
- Supports: OpenAI, Anthropic, Google, OpenRouter, Ollama

### `apps/mcp-server/src/main.ts` — MCP Server (single file)

Uses `@modelcontextprotocol/sdk` with stdio transport. Exposes 3 tools:
- `report_progress` — record a span (LLM call, tool use, system step)
- `report_result` — end a session with success/failure status
- `report_error` — report an error with severity

### `libs/sdk/src/` — TypeScript SDK (`@agentlens/sdk`)

| File | Exports | Purpose |
|------|---------|---------|
| `client.ts` | `AgentLensClient` | Core client — `record()`, `flush()`, `shutdown()`, `trace()`, PII scrubbing, offline buffering |
| `trace.ts` | `Trace`, `Span` | Scoped tracing context — auto-generates IDs, calculates duration, supports parent-child nesting |
| `wrappers/openai.ts` | `wrapOpenAI()` | Monkey-patches `chat.completions.create`, auto-detects `tool_calls` in response |
| `wrappers/anthropic.ts` | `wrapAnthropic()` | Patches `messages.create` + `messages.stream`, detects `tool_use` content blocks |
| `wrappers/vercel-ai.ts` | `wrapVercelAI()` | Wraps `generateText` + `streamText`, captures `toolCalls`/`toolResults` |
| `wrappers/fetch.ts` | `wrapFetch()` | Intercepts `globalThis.fetch`, pattern-matches URLs to known LLM APIs |
| `index.ts` | All of above | Barrel re-exports |

### `libs/common/src/` — Shared Code

| Directory | Contents |
|-----------|---------|
| `entities/` | TypeORM entities: `AgentSession`, `Span`, `ToolCall`, `TelemetryEvent`, `DailyAggregate`, `Project` |
| `dto/` | `IngestBatchDto`, `SpanEventDto`, `EndSessionDto` (class-validator decorated) |
| `constants/` | Queue names, span types, session statuses |
| `interfaces/` | `TelemetryIngestResult`, other shared interfaces |

### `dashboard/` — Next.js 15 Dashboard

Pages: overview, sessions (list + trace waterfall), tools (efficiency heatmap), retention (daily chart).
Uses internal API client in `lib/` to call `/v1/analytics/*`.

## Key API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/v1/projects` | `X-Master-Key` | Create project, returns API key |
| `POST` | `/v1/ingest` | `X-API-Key` | Ingest span batch |
| `POST` | `/v1/ingest/end-session` | `X-API-Key` | End session with status |
| `GET` | `/v1/analytics/overview` | `X-API-Key` | KPI summary |
| `GET` | `/v1/analytics/sessions` | `X-API-Key` | Paginated session list |
| `GET` | `/v1/analytics/sessions/:id/trace` | `X-API-Key` | Full span tree |
| `GET` | `/v1/analytics/tools` | `X-API-Key` | Tool efficiency metrics |
| `GET` | `/v1/analytics/retention` | `X-API-Key` | Daily activity |
| `GET` | `/v1/analytics/rl-insights` | `X-API-Key` | Q-value tool rankings |
| `GET` | `/v1/analytics/stream` | `X-API-Key` | SSE real-time events |
| `GET` | `/health` | None | Health check |

## Environment Variables

Defined in `.env.example`. Key vars:

| Variable | Default | Used by |
|----------|---------|---------|
| `APP_PORT` | 9471 | API |
| `DB_HOST` / `DB_PASSWORD` | postgres / — | API |
| `REDIS_HOST` | redis | API |
| `MASTER_API_KEY` | — | API (project creation) |
| `AGENTLENS_API_KEY` | — | Proxy, MCP Server |
| `PROXY_PORT` | 9473 | Proxy |
| `UPSTREAM_BASE_URL` | https://api.openai.com | Proxy |
| `DASHBOARD_PORT` | 9472 | Dashboard |
| `LOOP_DETECTION_THRESHOLD` | 3 | Processor |

## Build & Run

```bash
# Full Docker stack
docker compose up -d

# Individual builds
npm run build:api          # NestJS API
npm run build:proxy        # Proxy (tsc)
npm run build:mcp          # MCP server (nest build)
cd libs/sdk && npm run build  # SDK (tsc)
cd dashboard && npm run build # Dashboard (next build)

# Development
npm run start:api:dev      # API with hot reload
npm run start:proxy        # Proxy
cd dashboard && npm run dev # Dashboard with hot reload
```

## npm Packages

| Package | Dir | Published via |
|---------|-----|---------------|
| `@agentlens/sdk` | `libs/sdk/` | `.github/workflows/publish-sdk.yml` on release |
| `@agentlens/mcp-server` | `apps/mcp-server/` | `.github/workflows/publish-mcp.yml` on release |

## Conventions

- **TypeScript strict mode** everywhere
- **NestJS decorators**: `@Injectable()`, `@Controller()`, `@InjectRepository()`, etc.
- **TypeORM entities** use snake_case column names, PascalCase class properties
- **DTOs** use `class-validator` decorators for request validation
- **Module system**: CommonJS (`module: "commonjs"` in tsconfig)
- **Error handling**: NestJS exception filters, try/catch in services
- **Naming**: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.entity.ts`, `*.dto.ts`
