export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface AnalyticsDateRange {
    from: Date;
    to: Date;
    projectId: string;
}

export interface TelemetryIngestResult {
    accepted: number;
    rejected: number;
    sessionId: string;
    traceId: string;
}

export interface ProcessorJobData {
    sessionId: string;
    projectId: string;
    spans: unknown[];
}
