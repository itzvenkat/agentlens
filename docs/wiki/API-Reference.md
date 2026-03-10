# API Reference

Complete reference for the AgentLens REST API.

## Authentication

| Header | Used for |
|--------|---------|
| `X-API-Key: al_...` | All telemetry and analytics endpoints |
| `X-Master-Key: ...` | Project management endpoints |

## Endpoints

### Projects

#### Create project
```
POST /v1/projects
Header: X-Master-Key
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Unique project name |
| `description` | string | | Project description |

**Response:** `{ id, name, apiKey, description, createdAt }`

> The `apiKey` is only returned once. Save it immediately.

---

### Telemetry

#### Ingest spans
```
POST /v1/ingest
Header: X-API-Key
```

Accepts a batch of spans. See [[REST API]] for the full span field reference.

#### End session
```
POST /v1/ingest/end-session
Header: X-API-Key
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `traceId` | string | ✅ | The trace ID to end |
| `status` | string | ✅ | `success`, `failure`, or `timeout` |
| `errorMessage` | string | | Error message (for failures) |

#### Check intervention status
```
GET /v1/interventions/:traceId
Header: X-API-Key
```
Returns `{ status: 'none' | 'pending' | 'resolved', hint?: string }`.

#### Resolve intervention
```
POST /v1/interventions/resolve/:sessionId
Header: X-API-Key
```
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hint` | string | ✅ | Textual steering hint for the looping agent |

---

### Analytics

All analytics endpoints require `X-API-Key`.

#### Overview
```
GET /v1/analytics/overview
```
Returns KPI summary: total sessions, tokens, costs, success rate, average duration.

#### Sessions
```
GET /v1/analytics/sessions?page=1&limit=20&status=success
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `status` | string | | Filter by status |

#### Session trace
```
GET /v1/analytics/sessions/:id/trace
```
Returns the full span waterfall for a session.

#### Tool efficiency
```
GET /v1/analytics/tools
```
Returns tool usage statistics: call count, success rate, average duration, retry rate.

#### Retention
```
GET /v1/analytics/retention
```
Returns daily session counts and unique agent counts.

#### RL insights
```
GET /v1/analytics/rl-insights
```
Returns Q-value rankings for each tool. See [[RL Engine]] for how Q-values are computed.

#### Real-time stream
```
GET /v1/analytics/stream
```
Server-Sent Events (SSE) endpoint. Pushes real-time session and span events.

---

### Health

#### Health check
```
GET /health
```
No authentication. Returns `{ "status": "ok" }`.
