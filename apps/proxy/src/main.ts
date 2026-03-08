/**
 * AgentLens LLM Proxy — transparent HTTP proxy that sits between any LLM client
 * and the provider API. Auto-logs all requests/responses to AgentLens.
 *
 * Usage:
 *   Set your client's API base URL to http://localhost:9473
 *   The proxy forwards to the real API and logs telemetry to AgentLens.
 *
 * Supports: OpenAI, Anthropic, Google, OpenRouter, Ollama, and any OpenAI-compatible API.
 *
 * Environment:
 *   PROXY_PORT         — Port to listen on (default: 9473)
 *   AGENTLENS_API_URL  — AgentLens API endpoint (default: http://localhost:9471)
 *   AGENTLENS_API_KEY  — API key for AgentLens
 *   UPSTREAM_BASE_URL  — Default upstream API (default: https://api.openai.com)
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';

const PORT = parseInt(process.env.PROXY_PORT || '9473', 10);
const AGENTLENS_URL = process.env.AGENTLENS_API_URL || 'http://localhost:9471';
const AGENTLENS_KEY = process.env.AGENTLENS_API_KEY || '';
const DEFAULT_UPSTREAM = process.env.UPSTREAM_BASE_URL || 'https://api.openai.com';

// ── Provider detection ──────────────────────────────────────────────────────

interface ProviderConfig {
    name: string;
    upstream: string;
    extractUsage: (body: any) => { inputTokens?: number; outputTokens?: number };
    extractModel: (reqBody: any, resBody: any) => string;
    extractToolCalls: (resBody: any) => Array<{ name: string; input?: any }>;
}

const PROVIDERS: Record<string, ProviderConfig> = {
    openai: {
        name: 'openai',
        upstream: 'https://api.openai.com',
        extractUsage: (res) => ({
            inputTokens: res?.usage?.prompt_tokens,
            outputTokens: res?.usage?.completion_tokens,
        }),
        extractModel: (req, res) => req?.model || res?.model || 'unknown',
        extractToolCalls: (res) => {
            const calls: Array<{ name: string; input?: any }> = [];
            for (const choice of res?.choices || []) {
                for (const tc of choice?.message?.tool_calls || []) {
                    if (tc.type === 'function') {
                        let input: any;
                        try { input = JSON.parse(tc.function.arguments); } catch { /* */ }
                        calls.push({ name: tc.function.name, input });
                    }
                }
            }
            return calls;
        },
    },
    anthropic: {
        name: 'anthropic',
        upstream: 'https://api.anthropic.com',
        extractUsage: (res) => ({
            inputTokens: res?.usage?.input_tokens,
            outputTokens: res?.usage?.output_tokens,
        }),
        extractModel: (req, res) => req?.model || res?.model || 'unknown',
        extractToolCalls: (res) => {
            const calls: Array<{ name: string; input?: any }> = [];
            for (const block of res?.content || []) {
                if (block.type === 'tool_use') {
                    calls.push({ name: block.name, input: block.input });
                }
            }
            return calls;
        },
    },
    google: {
        name: 'google',
        upstream: 'https://generativelanguage.googleapis.com',
        extractUsage: (res) => ({
            inputTokens: res?.usageMetadata?.promptTokenCount,
            outputTokens: res?.usageMetadata?.candidatesTokenCount,
        }),
        extractModel: (req) => req?.model || 'unknown',
        extractToolCalls: () => [],
    },
    ollama: {
        name: 'ollama',
        upstream: 'http://localhost:11434',
        extractUsage: (res) => ({
            inputTokens: res?.prompt_eval_count,
            outputTokens: res?.eval_count,
        }),
        extractModel: (req, res) => req?.model || res?.model || 'unknown',
        extractToolCalls: () => [],
    },
};

// ── Detect provider from request headers ────────────────────────────────────

function detectProvider(headers: IncomingMessage['headers']): ProviderConfig {
    // Check for Anthropic-specific headers
    if (headers['x-api-key'] && headers['anthropic-version']) {
        return PROVIDERS.anthropic;
    }

    // Check for X-AgentLens-Provider header (explicit override)
    const override = headers['x-agentlens-provider'] as string;
    if (override && PROVIDERS[override.toLowerCase()]) {
        return PROVIDERS[override.toLowerCase()];
    }

    // Default to OpenAI-compatible
    return PROVIDERS.openai;
}

// ── Buffer management ───────────────────────────────────────────────────────

interface SpanEvent {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    type: 'llm' | 'tool' | 'system';
    name: string;
    model?: string;
    provider?: string;
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
    status?: string;
    toolName?: string;
    toolInputPreview?: Record<string, unknown>;
    toolOutputStatus?: string;
    attributes?: Record<string, unknown>;
    startedAt?: string;
    endedAt?: string;
}

let buffer: SpanEvent[] = [];

async function flushToAgentLens(): Promise<void> {
    if (buffer.length === 0 || !AGENTLENS_KEY) return;

    const batch = [...buffer];
    buffer = [];

    try {
        await fetch(`${AGENTLENS_URL}/v1/ingest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': AGENTLENS_KEY,
            },
            body: JSON.stringify({ spans: batch }),
        });
    } catch (err) {
        console.error('[proxy] Failed to flush to AgentLens:', (err as Error).message);
        // Put back in buffer for retry
        buffer.push(...batch);
    }
}

// Periodic flush
setInterval(flushToAgentLens, 3000);

// ── Read request body ───────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// ── Request handler ─────────────────────────────────────────────────────────

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Health check
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'agentlens-proxy' }));
        return;
    }

    const provider = detectProvider(req.headers);
    const upstream = process.env.UPSTREAM_BASE_URL || provider.upstream;
    const upstreamUrl = `${upstream}${req.url}`;
    const start = Date.now();
    const traceId = (req.headers['x-agentlens-trace-id'] as string) || crypto.randomUUID();
    const spanId = crypto.randomUUID();

    // Read request body
    const bodyBuffer = await readBody(req);
    let reqBody: any;
    try {
        reqBody = bodyBuffer.length > 0 ? JSON.parse(bodyBuffer.toString()) : undefined;
    } catch {
        reqBody = undefined;
    }

    // Build upstream headers (forward everything except host)
    const upstreamHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
        if (key === 'host' || key.startsWith('x-agentlens-')) continue;
        if (value) upstreamHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
    }

    try {
        // Forward to upstream
        const upstreamRes = await fetch(upstreamUrl, {
            method: req.method || 'POST',
            headers: upstreamHeaders,
            body: bodyBuffer.length > 0 ? new Uint8Array(bodyBuffer) : undefined,
        });

        const durationMs = Date.now() - start;

        // Check if this is a streaming response
        const contentType = upstreamRes.headers.get('content-type') || '';
        const isStreaming = contentType.includes('text/event-stream') ||
            (reqBody?.stream === true);

        if (isStreaming) {
            // For streaming: pipe through and log basic span (no token extraction)
            res.writeHead(upstreamRes.status, Object.fromEntries(upstreamRes.headers.entries()));

            const model = provider.extractModel(reqBody, null);
            buffer.push({
                traceId,
                spanId,
                type: 'llm',
                name: `${provider.name}.stream`,
                model,
                provider: provider.name,
                durationMs,
                status: upstreamRes.ok ? 'ok' : 'error',
                startedAt: new Date(start).toISOString(),
                endedAt: new Date().toISOString(),
                attributes: { streaming: true, path: req.url },
            });

            // Pipe the stream through to the client
            if (upstreamRes.body) {
                const reader = upstreamRes.body.getReader();
                const pump = async () => {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) { res.end(); return; }
                        res.write(value);
                    }
                };
                pump().catch(() => res.end());
            } else {
                res.end();
            }
        } else {
            // Non-streaming: read full response and extract telemetry
            const resBuffer = Buffer.from(await upstreamRes.arrayBuffer());
            let resBody: any;
            try {
                resBody = JSON.parse(resBuffer.toString());
            } catch {
                resBody = undefined;
            }

            const usage = provider.extractUsage(resBody);
            const model = provider.extractModel(reqBody, resBody);
            const toolCalls = provider.extractToolCalls(resBody);

            // Record LLM span
            buffer.push({
                traceId,
                spanId,
                type: 'llm',
                name: `${provider.name}.${req.url?.split('/').pop() || 'request'}`,
                model,
                provider: provider.name,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                durationMs: Date.now() - start,
                status: upstreamRes.ok ? 'ok' : 'error',
                startedAt: new Date(start).toISOString(),
                endedAt: new Date().toISOString(),
            });

            // Record tool call spans
            for (const tc of toolCalls) {
                buffer.push({
                    traceId,
                    spanId: crypto.randomUUID(),
                    parentSpanId: spanId,
                    type: 'tool',
                    name: tc.name,
                    toolName: tc.name,
                    toolInputPreview: tc.input,
                    toolOutputStatus: 'pending',
                    provider: provider.name,
                    model,
                    startedAt: new Date().toISOString(),
                    endedAt: new Date().toISOString(),
                });
            }

            // Forward response to client
            const resHeaders: Record<string, string> = {};
            upstreamRes.headers.forEach((value, key) => {
                resHeaders[key] = value;
            });
            res.writeHead(upstreamRes.status, resHeaders);
            res.end(resBuffer);
        }
    } catch (error) {
        const durationMs = Date.now() - start;
        buffer.push({
            traceId,
            spanId,
            type: 'llm',
            name: `${provider.name}.error`,
            provider: provider.name,
            model: reqBody?.model,
            durationMs,
            status: 'error',
            attributes: { error: (error as Error).message },
            startedAt: new Date(start).toISOString(),
            endedAt: new Date().toISOString(),
        });

        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: { message: `Proxy error: ${(error as Error).message}`, type: 'proxy_error' },
        }));
    }
}

// ── Start server ────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
    try {
        await handleRequest(req, res);
    } catch (err) {
        console.error('[proxy] Unhandled error:', err);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Internal proxy error' } }));
        }
    }
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║  AgentLens LLM Proxy                                 ║
║                                                       ║
║  Listening:     http://localhost:${PORT}                ║
║  Upstream:      ${DEFAULT_UPSTREAM.padEnd(37)}║
║  AgentLens:     ${AGENTLENS_URL.padEnd(37)}║
║  API Key:       ${AGENTLENS_KEY ? AGENTLENS_KEY.slice(0, 6) + '...' : '(not set)'}${' '.repeat(Math.max(0, 31 - (AGENTLENS_KEY ? AGENTLENS_KEY.slice(0, 6).length + 3 : 9)))}║
║                                                       ║
║  Set your client's base URL to:                       ║
║  http://localhost:${PORT}/v1                            ║
╚═══════════════════════════════════════════════════════╝
`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[proxy] Shutting down...');
    await flushToAgentLens();
    server.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('[proxy] Shutting down...');
    await flushToAgentLens();
    server.close();
    process.exit(0);
});
