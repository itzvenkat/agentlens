/**
 * AgentLens SDK — Core client for agentic observability.
 *
 * Fault-tolerance guarantees:
 *   - Telemetry failures NEVER crash the host agent (fire-and-forget)
 *   - Exponential backoff with jitter on transient failures
 *   - Circuit breaker opens after consecutive failures, auto-resets
 *   - Offline buffer capped to prevent memory leaks
 */

import { Trace } from './trace';

export interface AgentLensConfig {
    apiKey: string;
    endpoint?: string;
    batchSize?: number;
    flushIntervalMs?: number;
    enablePiiScrubbing?: boolean;
    offlineMode?: boolean;
    /** Max retries per flush attempt (default: 3) */
    maxRetries?: number;
    /** Max events to keep in offline buffer before dropping oldest (default: 10000) */
    maxOfflineBufferSize?: number;
    /** Number of consecutive failures before circuit opens (default: 5) */
    circuitBreakerThreshold?: number;
    /** How long circuit stays open in ms before half-open probe (default: 30000) */
    circuitBreakerResetMs?: number;
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

type CircuitState = 'closed' | 'open' | 'half-open';

export class AgentLensClient {
    private readonly config: Required<AgentLensConfig>;
    private buffer: SpanEvent[] = [];
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private offlineBuffer: SpanEvent[] = [];

    // ── Circuit breaker state ──
    private circuitState: CircuitState = 'closed';
    private consecutiveFailures = 0;
    private circuitOpenedAt = 0;

    constructor(config: AgentLensConfig) {
        this.config = {
            apiKey: config.apiKey,
            endpoint: config.endpoint || 'http://localhost:9471',
            batchSize: config.batchSize || 50,
            flushIntervalMs: config.flushIntervalMs || 5000,
            enablePiiScrubbing: config.enablePiiScrubbing ?? true,
            offlineMode: config.offlineMode ?? false,
            maxRetries: config.maxRetries ?? 3,
            maxOfflineBufferSize: config.maxOfflineBufferSize ?? 10_000,
            circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
            circuitBreakerResetMs: config.circuitBreakerResetMs ?? 30_000,
        };

        if (!this.config.offlineMode) {
            this.startFlushTimer();
        }
    }

    /**
     * Create a new Trace context for a task/session.
     */
    trace(traceId?: string): Trace {
        return new Trace(this, traceId);
    }

    /**
     * Record a span event to be batched and sent.
     * This is always fire-and-forget — never throws.
     */
    record(event: SpanEvent): void {
        try {
            if (this.config.enablePiiScrubbing) {
                event = this.scrubPii(event);
            }
            this.buffer.push(event);

            if (this.buffer.length >= this.config.batchSize) {
                // Fire-and-forget: don't await, don't throw
                this.flush().catch(() => { /* silently swallowed */ });
            }
        } catch {
            // SAFETY: never crash the host agent
        }
    }

    /**
     * Flush buffered events to the API with retry and circuit breaker.
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const batch = [...this.buffer];
        this.buffer = [];

        // Check circuit breaker
        if (this.isCircuitOpen()) {
            this.addToOfflineBuffer(batch);
            return;
        }

        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await fetch(`${this.config.endpoint}/v1/ingest`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': this.config.apiKey,
                    },
                    body: JSON.stringify({ spans: batch }),
                });

                if (response.ok) {
                    this.onSuccess();
                    return;
                }

                // 4xx errors (except 429) are non-retryable
                if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                    this.onFailure();
                    this.addToOfflineBuffer(batch);
                    return;
                }

                lastError = new Error(`HTTP ${response.status}`);
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
            }

            // Exponential backoff with jitter before next retry
            if (attempt < this.config.maxRetries) {
                const baseDelay = Math.min(1000 * Math.pow(2, attempt), 10_000);
                const jitter = Math.random() * baseDelay * 0.5;
                await this.sleep(baseDelay + jitter);
            }
        }

        // All retries exhausted
        this.onFailure();
        this.addToOfflineBuffer(batch);
    }

    /**
     * Sync offline buffer when connectivity is restored.
     */
    async syncOffline(): Promise<number> {
        if (this.offlineBuffer.length === 0) return 0;
        if (this.isCircuitOpen()) return 0;

        const batch = [...this.offlineBuffer];
        this.offlineBuffer = [];

        try {
            const response = await fetch(`${this.config.endpoint}/v1/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.config.apiKey,
                },
                body: JSON.stringify({ spans: batch }),
            });

            if (response.ok) {
                this.onSuccess();
                return batch.length;
            }
        } catch {
            // Connection still down
        }

        this.onFailure();
        this.addToOfflineBuffer(batch);
        return 0;
    }

    /**
     * Clean shutdown — flush remaining events.
     */
    async shutdown(): Promise<void> {
        if (this.flushTimer) clearInterval(this.flushTimer);
        await this.flush();
    }

    // ── Circuit breaker logic ──

    private isCircuitOpen(): boolean {
        if (this.circuitState === 'closed') return false;

        if (this.circuitState === 'open') {
            // Check if cooldown has elapsed → transition to half-open
            if (Date.now() - this.circuitOpenedAt >= this.config.circuitBreakerResetMs) {
                this.circuitState = 'half-open';
                return false; // allow one probe request
            }
            return true; // still open
        }

        // half-open: allow the request through
        return false;
    }

    private onSuccess(): void {
        this.consecutiveFailures = 0;
        this.circuitState = 'closed';
    }

    private onFailure(): void {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
            this.circuitState = 'open';
            this.circuitOpenedAt = Date.now();
        }
    }

    // ── Offline buffer with cap ──

    private addToOfflineBuffer(events: SpanEvent[]): void {
        this.offlineBuffer.push(...events);

        // Evict oldest events if buffer exceeds cap
        if (this.offlineBuffer.length > this.config.maxOfflineBufferSize) {
            const overflow = this.offlineBuffer.length - this.config.maxOfflineBufferSize;
            this.offlineBuffer.splice(0, overflow);
        }
    }

    // ── Internals ──

    private startFlushTimer(): void {
        this.flushTimer = setInterval(() => {
            this.flush().catch(() => { /* silently swallowed */ });
        }, this.config.flushIntervalMs);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private scrubPii(event: SpanEvent): SpanEvent {
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

