/**
 * @agentlens/sdk — Lightweight TypeScript SDK for agentic observability.
 *
 * Usage:
 *   import { AgentLensClient } from '@agentlens/sdk';
 *   const lens = new AgentLensClient({ apiKey: 'al_...', endpoint: 'http://localhost:9471' });
 *
 * Provider wrappers (tree-shakeable):
 *   import { wrapOpenAI } from '@agentlens/sdk/wrappers/openai';
 *   import { wrapAnthropic } from '@agentlens/sdk/wrappers/anthropic';
 *   import { wrapVercelAI } from '@agentlens/sdk/wrappers/vercel-ai';
 *   import { wrapFetch } from '@agentlens/sdk/wrappers/fetch';
 */

// Core
export { AgentLensClient, type AgentLensConfig, type SpanEvent } from './client';
export { Trace, Span } from './trace';

// Provider wrappers
export { wrapOpenAI } from './wrappers/openai';
export { wrapAnthropic } from './wrappers/anthropic';
export { wrapVercelAI } from './wrappers/vercel-ai';
export { wrapFetch } from './wrappers/fetch';

// Default export
export { AgentLensClient as default } from './client';
