# @agentlens/sdk

Lightweight TypeScript SDK for [AgentLens](https://github.com/itzvenkat/agentlens) — agentic observability and analytics.

## Install

```bash
npm install @agentlens/sdk
```

## Quick start

```typescript
import { AgentLensClient } from '@agentlens/sdk';

const lens = new AgentLensClient({
  apiKey: 'al_your_key_here',
  endpoint: 'http://localhost:3000',
});
```

### Wrap OpenAI (automatic tracing)

```typescript
import OpenAI from 'openai';

const openai = lens.wrapOpenAI(new OpenAI());

// All chat.completions.create calls are now traced automatically
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

### Manual spans

```typescript
lens.record({
  traceId: 'task-123',
  spanId: 'span-1',
  type: 'tool',
  toolName: 'read_file',
  durationMs: 45,
  status: 'ok',
});
```

### Shutdown

```typescript
// Flushes any remaining buffered events
await lens.shutdown();
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | — | Your AgentLens API key (required) |
| `endpoint` | `http://localhost:3000` | AgentLens API URL |
| `batchSize` | `50` | Events buffered before auto-flush |
| `flushIntervalMs` | `5000` | Auto-flush interval |
| `enablePiiScrubbing` | `true` | Redact emails and API keys from spans |
| `offlineMode` | `false` | Buffer events without sending (call `syncOffline()` later) |

## License

MIT
