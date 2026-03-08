# SDK Guide

The `@agentlens/sdk` package provides auto-instrumentation wrappers for popular LLM providers. Add 1-2 lines of code and all LLM calls, tool usage, and token consumption are automatically captured.

**Best for:** TypeScript/Node.js applications, custom agents, backend services.

## Install

```bash
npm install @agentlens/sdk
```

## Initialize

```typescript
import { AgentLensClient } from '@agentlens/sdk';

const lens = new AgentLensClient({
  apiKey: 'al_your_key_here',
  endpoint: 'http://localhost:9471',
});
```

## Auto-Instrumentation Wrappers

### OpenAI

```typescript
import OpenAI from 'openai';
import { AgentLensClient, wrapOpenAI } from '@agentlens/sdk';

const lens = new AgentLensClient({ apiKey: 'al_...', endpoint: 'http://localhost:9471' });
const openai = wrapOpenAI(lens, new OpenAI());

// All calls are now auto-traced — including tool calls in responses
const result = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

**What gets captured:**
- Model name, provider
- Input/output token counts from `response.usage`
- Duration
- Tool calls from `response.choices[].message.tool_calls[]` (each as a separate span)

### Anthropic

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { AgentLensClient, wrapAnthropic } from '@agentlens/sdk';

const lens = new AgentLensClient({ apiKey: 'al_...', endpoint: 'http://localhost:9471' });
const anthropic = wrapAnthropic(lens, new Anthropic());

// messages.create and messages.stream are both auto-traced
const result = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

**What gets captured:**
- Model, input/output tokens from `response.usage`
- `tool_use` content blocks (each as a child span)
- Streaming support via `messages.stream()`

### Vercel AI SDK

```typescript
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { AgentLensClient, wrapVercelAI } from '@agentlens/sdk';

const lens = new AgentLensClient({ apiKey: 'al_...', endpoint: 'http://localhost:9471' });
const ai = wrapVercelAI(lens, { generateText, streamText });

const result = await ai.generateText({
  model: openai('gpt-4o'),
  prompt: 'What is the capital of France?',
});
```

**What gets captured:**
- Model ID and provider from the model object
- Token usage from `result.usage`
- Tool calls from `result.toolCalls` and `result.toolResults`

### Generic Fetch (any provider)

Wraps `globalThis.fetch` to auto-detect calls to known LLM APIs:

```typescript
import { AgentLensClient, wrapFetch } from '@agentlens/sdk';

const lens = new AgentLensClient({ apiKey: 'al_...', endpoint: 'http://localhost:9471' });
globalThis.fetch = wrapFetch(lens, globalThis.fetch);

// Now ALL fetch() calls to OpenAI, Anthropic, Google, OpenRouter, or Ollama
// are automatically traced — zero per-provider setup needed
```

This is especially useful as a catch-all fallback or for providers without a dedicated wrapper.

## Manual Spans

For custom logic that isn't an LLM call (tool execution, data fetching, etc.):

```typescript
// Create a trace (groups related spans together)
const trace = lens.trace('task-123');

// Create a span
const span = trace.span('tool', 'read_file');
// ... do work ...
span.end({ status: 'ok', toolName: 'read_file' });

// Nested spans (parent-child)
const llmSpan = trace.span('llm', 'generate');
const toolSpan = llmSpan.child('tool', 'web_search');
// ... search ...
toolSpan.end({ toolName: 'web_search', status: 'ok' });
llmSpan.end({ model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });

// End the trace (flushes all buffered events)
await trace.end('success');
```

### Span types

| Type | Use for |
|------|---------|
| `llm` | LLM API calls (chat completions, generations) |
| `tool` | Tool/function executions |
| `system` | Internal operations (routing, parsing, etc.) |

### Span end options

```typescript
span.end({
  status: 'ok',           // 'ok', 'error', or custom
  model: 'gpt-4o',        // Model name
  provider: 'openai',     // Provider name
  inputTokens: 100,       // Prompt tokens
  outputTokens: 50,       // Completion tokens
  toolName: 'read_file',  // Tool name (for tool spans)
  toolInputPreview: {},   // Tool input (scrubbed for PII)
  toolOutputPreview: {},  // Tool output
  toolOutputStatus: 'ok', // Tool result status
  attributes: {},         // Any extra metadata
});
```

## Client Configuration

```typescript
const lens = new AgentLensClient({
  apiKey: 'al_...',           // Required — your project API key
  endpoint: 'http://...',     // Default: http://localhost:9471
  batchSize: 50,              // Flush after N events (default: 50)
  flushIntervalMs: 5000,      // Auto-flush interval in ms (default: 5000)
  enablePiiScrubbing: true,   // Redact emails & API keys (default: true)
  offlineMode: false,         // Buffer without sending (default: false)
});
```

## PII Scrubbing

Enabled by default. Automatically redacts:
- Email addresses → `[EMAIL_REDACTED]`
- API keys (patterns like `sk_`, `pk_`, `key_`, `api_`) → `[API_KEY_REDACTED]`

## Shutdown

Always call `shutdown()` before your process exits to flush remaining events:

```typescript
process.on('SIGTERM', async () => {
  await lens.shutdown();
  process.exit(0);
});
```
