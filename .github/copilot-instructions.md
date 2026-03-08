You are working on AgentLens — a self-hosted observability platform for AI agents.

## Architecture
- NestJS 11 API (apps/api/) on port 3000
- Next.js 15 dashboard (dashboard/) on port 3001
- LLM Proxy (apps/proxy/) on port 4000 — pure Node.js, zero deps
- TypeScript SDK (libs/sdk/) — @agentlens/sdk on npm
- MCP Server (apps/mcp-server/) — @agentlens/mcp-server on npm
- Shared code in libs/common/ (entities, DTOs, constants)

## Conventions
- TypeScript strict mode, CommonJS modules
- NestJS patterns: @Injectable(), @Controller(), @InjectRepository()
- TypeORM entities: snake_case DB columns, PascalCase class properties
- DTOs: class-validator decorators
- Auth: X-API-Key header (telemetry), X-Master-Key (project management)
- File naming: *.controller.ts, *.service.ts, *.module.ts, *.entity.ts

## Key Data Flow
POST /v1/ingest → IngestController → IngestService (save spans, tool_calls) → BullMQ queue → ProcessorService (loop detection, RL reward, aggregation)

## Database
PostgreSQL 16 with tables: projects, agent_sessions, spans, tool_calls, events, daily_aggregates

## Build
```
docker compose up -d       # Full stack
npm run build:api          # API
npm run build:proxy        # Proxy
cd libs/sdk && npm run build  # SDK
```
