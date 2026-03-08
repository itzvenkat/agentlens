# AgentLens — Claude Project Context

> This file is read by Claude Code (claude.ai/code) and Claude Desktop when working on this project.

## Project Overview

AgentLens is a self-hosted observability platform for AI agents — "Datadog for AI agents." It captures telemetry (LLM calls, tool usage, tokens) and surfaces analytics via a dashboard with an RL-based tool scoring engine.

## Tech Stack

- **API**: NestJS 11 + TypeORM + PostgreSQL 16 + BullMQ/Redis 7
- **Dashboard**: Next.js 15 + React 19
- **SDK**: TypeScript, zero runtime deps, published as `@agentlens/sdk`
- **Proxy**: Pure Node.js HTTP server (zero deps), port 4000
- **MCP Server**: `@modelcontextprotocol/sdk`, stdio transport
- **Module system**: CommonJS everywhere

## Project Structure

```
apps/api/src/       → NestJS API (auth, ingest, analytics, processor, health, config)
apps/proxy/src/     → LLM Proxy (single file: main.ts)
apps/mcp-server/src/→ MCP server (single file: main.ts)
libs/sdk/src/       → SDK (client.ts, trace.ts, wrappers/{openai,anthropic,vercel-ai,fetch}.ts)
libs/common/src/    → Shared entities, DTOs, constants, interfaces
dashboard/src/      → Next.js dashboard (overview, sessions, tools, retention pages)
docker/             → Dockerfiles (api, dashboard, proxy) + init.sql
```

## Key Patterns

- TypeORM entities use snake_case DB columns → PascalCase class properties
- DTOs use class-validator decorators for request validation
- Auth: `X-API-Key` header for telemetry, `X-Master-Key` for project creation
- Telemetry flow: `POST /v1/ingest` → IngestService → BullMQ → ProcessorService
- PII scrubbing: emails → `[EMAIL_REDACTED]`, API keys → `[API_KEY_REDACTED]`
- SDK wrappers monkey-patch provider client methods (chat.completions.create, etc.)

## Database Tables

`projects`, `agent_sessions`, `spans`, `tool_calls`, `events`, `daily_aggregates`

## Build Commands

```bash
docker compose up -d           # Full stack
npm run build:api              # API
npm run build:proxy            # Proxy
npm run build:mcp              # MCP server
cd libs/sdk && npm run build   # SDK
cd dashboard && npm run dev    # Dashboard dev
```

## Environment

From `.env.development`: API on :3000, Dashboard on :3001, Proxy on :4000.
Key vars: `MASTER_API_KEY`, `AGENTLENS_API_KEY`, `UPSTREAM_BASE_URL`, `DB_PASSWORD`.

## Things to Know

- The proxy auto-detects providers from request headers (Anthropic `x-api-key` + `anthropic-version`, or default OpenAI)
- The RL engine uses Q-learning: Q(tool) = Q(tool) + α(reward − Q(tool))
- Loop detection flags when the same tool is called N consecutive times (threshold configurable)
- SDK `wrapFetch()` pattern-matches URLs to detect OpenAI, Anthropic, Google, OpenRouter, Ollama
- Wiki docs live in `docs/wiki/` and auto-sync to GitHub wiki via `.github/workflows/wiki-sync.yml`
