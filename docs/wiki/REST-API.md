# REST API

Send telemetry to AgentLens directly via HTTP. Works from any language or framework.

**Best for:** Non-TypeScript agents, custom integrations, server-side batch processing.

## Authentication

All endpoints (except `/health`) require the `X-API-Key` header:

```
X-API-Key: al_your_key_here
```

Project creation requires the master key:

```
X-Master-Key: your_master_key
```

## Endpoints

### Create a project

```
POST /v1/projects
```

```bash
curl -X POST http://localhost:9471/v1/projects \
  -H "X-Master-Key: agentlens_master_dev_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent", "description": "My AI agent"}'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "my-agent",
  "apiKey": "al_abc123..."
}
```

### Ingest spans

```
POST /v1/ingest
```

Send one or more spans in a batch:

```bash
curl -X POST http://localhost:9471/v1/ingest \
  -H "X-API-Key: al_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "spans": [
      {
        "traceId": "task-123",
        "spanId": "span-1",
        "type": "llm",
        "name": "chat.completions",
        "model": "gpt-4o",
        "provider": "openai",
        "inputTokens": 150,
        "outputTokens": 80,
        "durationMs": 1200,
        "status": "ok",
        "startedAt": "2026-01-01T00:00:00Z",
        "endedAt": "2026-01-01T00:00:01Z"
      },
      {
        "traceId": "task-123",
        "spanId": "span-2",
        "parentSpanId": "span-1",
        "type": "tool",
        "toolName": "web_search",
        "durationMs": 500,
        "status": "ok"
      }
    ]
  }'
```

**Span fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `traceId` | string | ✅ | Groups related spans into a session |
| `spanId` | string | ✅ | Unique ID for this span |
| `type` | string | ✅ | `llm`, `tool`, or `system` |
| `parentSpanId` | string | | Parent span (for nesting) |
| `name` | string | | Operation name |
| `model` | string | | LLM model name |
| `provider` | string | | Provider name (openai, anthropic, etc.) |
| `inputTokens` | number | | Prompt/input token count |
| `outputTokens` | number | | Completion/output token count |
| `durationMs` | number | | Duration in milliseconds |
| `status` | string | | `ok`, `error`, or custom |
| `toolName` | string | | Tool name (for tool spans) |
| `toolInputHash` | string | | Hash of tool input (for duplicate detection) |
| `toolInputPreview` | object | | Truncated tool input |
| `toolOutputPreview` | object | | Truncated tool output |
| `toolOutputStatus` | string | | Tool result status |
| `isRetry` | boolean | | Whether this is a retry |
| `attributes` | object | | Any extra metadata |
| `startedAt` | string | | ISO 8601 timestamp |
| `endedAt` | string | | ISO 8601 timestamp |

### End a session

```
POST /v1/ingest/end-session
```

```bash
curl -X POST http://localhost:9471/v1/ingest/end-session \
  -H "X-API-Key: al_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "traceId": "task-123",
    "status": "success",
    "errorMessage": null
  }'
```

### Analytics endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /v1/analytics/overview` | KPI summary (sessions, tokens, costs, success rate) |
| `GET /v1/analytics/sessions` | Paginated session list |
| `GET /v1/analytics/sessions/:id/trace` | Span waterfall for a session |
| `GET /v1/interventions/:traceId` | Check active intervention state for a trace |
| `POST /v1/interventions/resolve/:sessionId` | Submit a developer hint to release a stuck trace |
| `GET /v1/analytics/tools` | Tool efficiency metrics |
| `GET /v1/analytics/retention` | Retention data (daily agent activity) |
| `GET /v1/analytics/rl-insights` | RL Q-value tool rankings |
| `GET /v1/analytics/stream` | Server-Sent Events (real-time updates) |

### Health check

```
GET /health
```

No authentication required. Returns `{ "status": "ok" }`.
