import type { AgentLensClient } from './client';

/**
 * Span — a single operation within a trace (LLM call, tool call, etc.)
 */
export class Span {
    readonly traceId: string;
    readonly spanId: string;
    readonly parentSpanId?: string;
    readonly type: 'llm' | 'tool' | 'system';
    readonly name: string;
    private readonly startTime: number;
    private readonly startedAt: string;
    private readonly client: AgentLensClient;
    private ended = false;

    constructor(
        client: AgentLensClient,
        traceId: string,
        type: 'llm' | 'tool' | 'system',
        name: string,
        parentSpanId?: string,
    ) {
        this.client = client;
        this.traceId = traceId;
        this.spanId = crypto.randomUUID();
        this.parentSpanId = parentSpanId;
        this.type = type;
        this.name = name;
        this.startTime = Date.now();
        this.startedAt = new Date().toISOString();

        // Record span start
        this.client.record({
            traceId: this.traceId,
            spanId: this.spanId,
            parentSpanId: this.parentSpanId,
            type: this.type,
            name: this.name,
            startedAt: this.startedAt,
        });
    }

    /**
     * End this span with optional metadata.
     */
    end(data: {
        status?: string;
        model?: string;
        provider?: string;
        inputTokens?: number;
        outputTokens?: number;
        toolName?: string;
        toolInputHash?: string;
        toolOutputStatus?: string;
        isRetry?: boolean;
        toolInputPreview?: Record<string, unknown>;
        toolOutputPreview?: Record<string, unknown>;
        attributes?: Record<string, unknown>;
    } = {}): void {
        if (this.ended) return;
        this.ended = true;

        this.client.record({
            traceId: this.traceId,
            spanId: this.spanId,
            parentSpanId: this.parentSpanId,
            type: this.type,
            name: this.name,
            durationMs: Date.now() - this.startTime,
            status: data.status || 'ok',
            model: data.model,
            provider: data.provider,
            inputTokens: data.inputTokens,
            outputTokens: data.outputTokens,
            toolName: data.toolName,
            toolInputHash: data.toolInputHash,
            toolOutputStatus: data.toolOutputStatus,
            isRetry: data.isRetry,
            toolInputPreview: data.toolInputPreview,
            toolOutputPreview: data.toolOutputPreview,
            attributes: data.attributes,
            startedAt: this.startedAt,
            endedAt: new Date().toISOString(),
        });
    }

    /**
     * Create a child span nested under this one.
     */
    child(type: 'llm' | 'tool' | 'system', name: string): Span {
        return new Span(this.client, this.traceId, type, name, this.spanId);
    }
}

/**
 * Trace — a scoped context for a single agent session/task.
 *
 * Usage:
 *   const trace = lens.trace('task-123');
 *   const span = trace.span('llm', 'chat.completions.create');
 *   span.end({ inputTokens: 100, outputTokens: 50 });
 *   await trace.end('success');
 */
export class Trace {
    readonly traceId: string;
    private readonly client: AgentLensClient;

    constructor(client: AgentLensClient, traceId?: string) {
        this.client = client;
        this.traceId = traceId || crypto.randomUUID();
    }

    /**
     * Create a new span within this trace.
     */
    span(type: 'llm' | 'tool' | 'system', name: string, parentSpanId?: string): Span {
        return new Span(this.client, this.traceId, type, name, parentSpanId);
    }

    /**
     * End the trace / session. Flushes buffered events.
     */
    async end(status: 'success' | 'failure' | 'timeout' = 'success', errorMessage?: string): Promise<void> {
        // Record a final system span marking trace completion
        const span = this.span('system', `trace.${status}`);
        span.end({
            status,
            attributes: errorMessage ? { errorMessage } : undefined,
        });
        await this.client.flush();
    }
}
