const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface FetchOptions {
    apiKey: string;
    params?: Record<string, string>;
}

async function apiFetch<T>(path: string, options: FetchOptions): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    if (options.params) {
        Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
        headers: {
            'X-API-Key': options.apiKey,
            'Content-Type': 'application/json',
        },
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
}

// ── Analytics API ──

export interface Overview {
    totalSessions: number;
    successRate: number;
    avgCostPerSession: number;
    avgCostPerSuccess: number;
    totalTokens: number;
    totalCostUsd: number;
    loopDetectionRate: number;
    avgToolsPerSession: number;
}

export interface SessionItem {
    id: string;
    traceId: string;
    model: string | null;
    status: string;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
    toolCallsCount: number;
    loopDetected: boolean;
    startedAt: string;
    endedAt: string | null;
}

export interface PaginatedSessions {
    data: SessionItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ToolEfficiency {
    toolName: string;
    totalCalls: number;
    successRate: number;
    avgDurationMs: number;
    retryRate: number;
    errorRate: number;
}

export interface RetentionPoint {
    date: string;
    uniqueAgents: number;
    totalSessions: number;
    returningAgents: number;
    retentionRate: number;
}

export interface RLInsight {
    toolName: string;
    qValue: number;
    actionCount: number;
    avgReward: number;
    recommendation: string;
}

export const api = {
    getOverview: (opts: FetchOptions) =>
        apiFetch<Overview>('/v1/analytics/overview', opts),

    getSessions: (opts: FetchOptions & { page?: number; pageSize?: number }) =>
        apiFetch<PaginatedSessions>('/v1/analytics/sessions', {
            ...opts,
            params: {
                ...opts.params,
                page: String(opts.page || 1),
                pageSize: String(opts.pageSize || 20),
            },
        }),

    getToolEfficiency: (opts: FetchOptions) =>
        apiFetch<ToolEfficiency[]>('/v1/analytics/tools', opts),

    getRetention: (opts: FetchOptions & { days?: number }) =>
        apiFetch<RetentionPoint[]>('/v1/analytics/retention', {
            ...opts,
            params: { ...opts.params, days: String(opts.days || 30) },
        }),

    getRLInsights: (opts: FetchOptions) =>
        apiFetch<RLInsight[]>('/v1/analytics/rl-insights', opts),
};
