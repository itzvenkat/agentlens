# @itzvenkat0/agentlens-sdk

Lightweight TypeScript SDK for [AgentLens](https://github.com/itzvenkat/agentlens) — automatic observability for AI agents.

## Install

```bash
npm install @itzvenkat0/agentlens-sdk
```

## Quick Start

```typescript
import { AgentLensClient } from '@itzvenkat0/agentlens-sdk';

const lens = new AgentLensClient({
  apiKey: 'al_your_key_here',
  endpoint: 'http://localhost:9471',
});
```

## Auto-Instrumentation

### OpenAI

```typescript
import OpenAI from 'openai';
import { AgentLensClient, wrapOpenAI } from '@itzvenkat0/agentlens-sdk';

const lens = new AgentLensClient({ apiKey: 'al_...' });
const openai = wrapOpenAI(lens, new OpenAI());

// All calls are now auto-traced, including tool calls
const result = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

### Anthropic

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { AgentLensClient, wrapAnthropic } from '@itzvenkat0/agentlens-sdk';

const lens = new AgentLensClient({ apiKey: 'al_...' });
const anthropic = wrapAnthropic(lens, new Anthropic());

// messages.create and messages.stream are auto-traced
// tool_use content blocks are auto-detected
const result = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }],
});
```

### Vercel AI SDK

```typescript
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { AgentLensClient, wrapVercelAI } from '@itzvenkat0/agentlens-sdk';

const lens = new AgentLensClient({ apiKey: 'al_...' });
const ai = wrapVercelAI(lens, { generateText, streamText });

// generateText and streamText are auto-traced
const result = await ai.generateText({
  model: openai('gpt-4o'),
  prompt: 'Hello',
});
```

### Generic Fetch (zero-config)

Auto-detects calls to OpenAI, Anthropic, Google, OpenRouter, and Ollama APIs:

```typescript
import { AgentLensClient, wrapFetch } from '@itzvenkat0/agentlens-sdk';

const lens = new AgentLensClient({ apiKey: 'al_...' });
globalThis.fetch = wrapFetch(lens, globalThis.fetch);

// All LLM API calls via fetch() are now auto-traced
```

## Manual Spans

For custom instrumentation:

```typescript
const trace = lens.trace('task-123');

const span = trace.span('tool', 'read_file');
// ... do work ...
span.end({ status: 'ok', toolName: 'read_file' });

// Nested spans
const llmSpan = trace.span('llm', 'generate');
const toolSpan = llmSpan.child('tool', 'search');
toolSpan.end({ toolName: 'search' });
llmSpan.end({ model: 'gpt-4o', inputTokens: 100 });

await trace.end('success');
```

## Configuration

```typescript
const lens = new AgentLensClient({
  apiKey: 'al_...',         // Required
  endpoint: 'http://...',   // Default: http://localhost:9471
  batchSize: 50,            // Flush after N events
  flushIntervalMs: 5000,    // Auto-flush interval
  enablePiiScrubbing: true, // Redact emails & API keys
  offlineMode: false,       // Buffer without sending
});
```

## License

MIT
