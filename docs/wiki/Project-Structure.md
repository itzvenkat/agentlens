# Project Structure

```
agentlens/
├── apps/
│   ├── api/                        # NestJS REST API
│   │   └── src/
│   │       ├── auth/               # API key authentication, project CRUD
│   │       ├── ingest/             # Telemetry ingestion (POST /v1/ingest)
│   │       ├── analytics/          # Query endpoints, SSE streaming
│   │       ├── processor/          # Background jobs (BullMQ)
│   │       │   ├── loop detection  # Detects repeated tool call patterns
│   │       │   ├── RL reward       # Q-learning tool scoring
│   │       │   └── aggregation     # Daily metrics rollup
│   │       ├── health/             # Health check endpoint
│   │       └── config/             # Environment validation (Joi)
│   │
│   ├── mcp-server/                 # MCP server (stdio transport)
│   │   └── src/main.ts             # Exposes report_progress/result/error tools
│   │
│   └── proxy/                      # Transparent LLM Proxy
│       └── src/main.ts             # HTTP proxy with provider auto-detection
│
├── libs/
│   ├── common/                     # Shared code
│   │   └── src/
│   │       ├── entities/           # TypeORM entities (Session, Span, ToolCall, etc.)
│   │       ├── dto/                # Data transfer objects
│   │       ├── constants/          # Shared constants
│   │       └── interfaces/         # Shared TypeScript interfaces
│   │
│   └── sdk/                        # @itzvenkat0/agentlens-sdk (published to npm)
│       └── src/
│           ├── client.ts           # AgentLensClient (batching, flush, PII)
│           ├── trace.ts            # Trace + Span classes
│           ├── index.ts            # Barrel exports
│           └── wrappers/
│               ├── openai.ts       # OpenAI auto-wrapper
│               ├── anthropic.ts    # Anthropic auto-wrapper
│               ├── vercel-ai.ts    # Vercel AI SDK wrapper
│               └── fetch.ts        # Generic fetch interceptor
│
├── dashboard/                      # Next.js 15 analytics dashboard
│   └── src/
│       ├── app/                    # Pages
│       │   ├── overview/           # KPIs, RL insights, recent sessions
│       │   ├── sessions/           # Session list + trace waterfall
│       │   ├── tools/              # Tool efficiency heatmap
│       │   └── retention/          # Daily activity chart
│       ├── components/             # Shared UI components
│       └── lib/                    # API client utilities
│
├── docker/                         # Docker configurations
│   ├── Dockerfile.api              # Multi-stage API build
│   ├── Dockerfile.dashboard        # Multi-stage dashboard build
│   ├── Dockerfile.proxy            # Lightweight proxy build
│   └── init.sql                    # Database schema (initial setup)
│
├── docs/wiki/                      # GitHub wiki source pages
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # CI (build + test all components)
│   │   ├── publish-sdk.yml         # Publish SDK to npm on release
│   │   ├── publish-mcp.yml         # Publish MCP server to npm on release
│   │   └── wiki-sync.yml           # Auto-sync docs/ to GitHub wiki
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── pull_request_template.md
│
├── .env.example                    # Environment template (documented)
├── docker-compose.yml              # All 5 services
├── nest-cli.json                   # NestJS monorepo config
├── tsconfig.json                   # Root TypeScript config
├── package.json                    # Monorepo scripts
├── CONTRIBUTING.md                 # How to contribute
└── LICENSE                         # MIT
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| **API** | NestJS 11, TypeORM, PostgreSQL 16 |
| **Queue** | BullMQ, Redis 7 |
| **Dashboard** | Next.js 15, React 19 |
| **SDK** | TypeScript, zero runtime dependencies |
| **MCP** | @modelcontextprotocol/sdk (stdio transport) |
| **Proxy** | Pure Node.js HTTP, zero dependencies |
| **Containers** | Docker, multi-stage Alpine builds |
