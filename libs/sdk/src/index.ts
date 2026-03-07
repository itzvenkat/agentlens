import { createHash } from 'crypto';

/**
 * AgentLens SDK — Lightweight TypeScript wrapper for agentic observability.
 *
 * Usage:
 *   import { AgentLensClient } from '@agentlens/sdk';
 *   const lens = new AgentLensClient({ apiKey: 'al_...', endpoint: 'http://localhost:3000' });
 *   const wrapped = lens.wrapOpenAI(openaiClient);
 */

export interface AgentLensConfig {
    apiKey: string;
    endpoint?: string;
    batchSize?: number;
    flushIntervalMs?: number;
    enablePiiScrubbing?: boolean;
    offlineMode?: boolean;
}

export interface SpanEvent {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    type: 'llm' | 'tool' | 'system';
    name?: string;
    model?: string;
    provider?: string;
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
    status?: string;
    toolName?: string;
    toolInputHash?: string;
    toolOutputStatus?: string;
    isRetry?: boolean;
    toolInputPreview?: Record<string, unknown>;
    toolOutputPreview?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
    startedAt?: string;
    endedAt?: string;
}

export class AgentLensClient {
    private readonly config: Required<AgentLensConfig>;
    private buffer: SpanEvent[] = [];
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private offlineBuffer: SpanEvent[] = [];

    constructor(config: AgentLensConfig) {
        this.config = {
            apiKey: config.apiKey,
            endpoint: config.endpoint || 'http://localhost:3000',
            batchSize: config.batchSize || 50,
            flushIntervalMs: config.flushIntervalMs || 5000,
            enablePiiScrubbing: config.enablePiiScrubbing ?? true,
            offlineMode: config.offlineMode ?? false,
        };

        if (!this.config.offlineMode) {
            this.startFlushTimer();
        }
    }

    /**
     * Record a span event to be batched and sent.
     */
    record(event: SpanEvent): void {
        if (this.config.enablePiiScrubbing) {
            event = this.scrubPii(event);
        }
        this.buffer.push(event);

        if (this.buffer.length >= this.config.batchSize) {
            this.flush();
        }
    }

    /**
     * Create a traced wrapper around an OpenAI client.
     */
    wrapOpenAI(client: any, traceId?: string): any {
        const self = this;
        const trace = traceId || crypto.randomUUID();

        const originalCreate = client.chat?.completions?.create;
        if (originalCreate) {
            client.chat.completions.create = async function (...args: any[]) {
                const spanId = crypto.randomUUID();
                const start = Date.now();

                self.record({
                    traceId: trace,
                    spanId,
                    type: 'llm',
                    name: 'chat.completions.create',
                    model: args[0]?.model,
                    provider: 'openai',
                    startedAt: new Date().toISOString(),
                });

                try {
                    const result = await originalCreate.apply(this, args);
                    const duration = Date.now() - start;

                    self.record({
                        traceId: trace,
                        spanId,
                        type: 'llm',
                        name: 'chat.completions.create',
                        model: args[0]?.model,
                        provider: 'openai',
                        inputTokens: result.usage?.prompt_tokens,
                        outputTokens: result.usage?.completion_tokens,
                        durationMs: duration,
                        status: 'ok',
                        endedAt: new Date().toISOString(),
                    });

                    return result;
                } catch (error) {
                    const duration = Date.now() - start;
                    self.record({
                        traceId: trace,
                        spanId,
                        type: 'llm',
                        name: 'chat.completions.create',
                        model: args[0]?.model,
                        provider: 'openai',
                        durationMs: duration,
                        status: 'error',
                        attributes: { error: (error as Error).message },
                        endedAt: new Date().toISOString(),
                    });
                    throw error;
                }
            };
        }

        return client;
    }

    /**
     * Flush buffered events to the API.
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const batch = [...this.buffer];
        this.buffer = [];

        try {
            const response = await fetch(`${this.config.endpoint}/v1/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.config.apiKey,
                },
                body: JSON.stringify({ spans: batch }),
            });

            if (!response.ok) {
                // Move to offline buffer on failure
                this.offlineBuffer.push(...batch);
            }
        } catch {
            // Network error — store offline
            this.offlineBuffer.push(...batch);
        }
    }

    /**
     * Sync offline buffer when connectivity is restored.
     */
    async syncOffline(): Promise<number> {
        if (this.offlineBuffer.length === 0) return 0;

        const batch = [...this.offlineBuffer];
        this.offlineBuffer = [];

        try {
            await fetch(`${this.config.endpoint}/v1/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.config.apiKey,
                },
                body: JSON.stringify({ spans: batch }),
            });
            return batch.length;
        } catch {
            this.offlineBuffer.push(...batch);
            return 0;
        }
    }

    /**
     * Clean shutdown — flush remaining events.
     */
    async shutdown(): Promise<void> {
        if (this.flushTimer) clearInterval(this.flushTimer);
        await this.flush();
    }

    private startFlushTimer(): void {
        this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);
    }

    private scrubPii(event: SpanEvent): SpanEvent {
        // Deep clone and scrub string values
        const scrubbed = JSON.parse(JSON.stringify(event));
        this.scrubObject(scrubbed);
        return scrubbed;
    }

    private scrubObject(obj: any): void {
        if (!obj || typeof obj !== 'object') return;

        for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key]
                    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
                    .replace(/(sk_|pk_|key_|api_|token_)[a-zA-Z0-9_\-.]{8,}/gi, '[API_KEY_REDACTED]');
            } else if (typeof obj[key] === 'object') {
                this.scrubObject(obj[key]);
            }
        }
    }
}

export default AgentLensClient;
