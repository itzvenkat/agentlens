import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum, IsObject, IsBoolean, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

// ── Ingest DTOs ─────────────────────────────

export class SpanEventDto {
    @IsString()
    traceId!: string;

    @IsString()
    spanId!: string;

    @IsOptional()
    @IsString()
    parentSpanId?: string;

    @IsEnum(['llm', 'tool', 'system'])
    type!: 'llm' | 'tool' | 'system';

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    model?: string;

    @IsOptional()
    @IsString()
    provider?: string;

    @IsOptional()
    @IsNumber()
    inputTokens?: number;

    @IsOptional()
    @IsNumber()
    outputTokens?: number;

    @IsOptional()
    @IsNumber()
    durationMs?: number;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsObject()
    attributes?: Record<string, unknown>;

    @IsOptional()
    @IsString()
    startedAt?: string;

    @IsOptional()
    @IsString()
    endedAt?: string;

    // ── Tool-specific fields ──
    @IsOptional()
    @IsString()
    toolName?: string;

    @IsOptional()
    @IsString()
    toolInputHash?: string;

    @IsOptional()
    @IsString()
    toolOutputStatus?: string;

    @IsOptional()
    @IsBoolean()
    isRetry?: boolean;

    @IsOptional()
    @IsObject()
    toolInputPreview?: Record<string, unknown>;

    @IsOptional()
    @IsObject()
    toolOutputPreview?: Record<string, unknown>;
}

export class IngestBatchDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SpanEventDto)
    spans!: SpanEventDto[];

    @IsOptional()
    @IsString()
    sessionId?: string;

    @IsOptional()
    @IsObject()
    sessionMeta?: Record<string, unknown>;
}

// ── Session DTOs ────────────────────────────

export class EndSessionDto {
    @IsUUID()
    sessionId!: string;

    @IsEnum(['success', 'failure', 'timeout'])
    status!: 'success' | 'failure' | 'timeout';

    @IsOptional()
    @IsString()
    errorMessage?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

// ── Project DTOs ────────────────────────────

export class CreateProjectDto {
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;
}

export class ProjectResponseDto {
    id!: string;
    name!: string;
    description!: string | null;
    apiKeyPrefix!: string;
    apiKey?: string; // Only returned on creation
    isActive!: boolean;
    createdAt!: Date;
}

// ── Analytics Response DTOs ─────────────────

export class OverviewDto {
    totalSessions!: number;
    successRate!: number;
    avgCostPerSession!: number;
    avgCostPerSuccess!: number;
    totalTokens!: number;
    totalCostUsd!: number;
    loopDetectionRate!: number;
    avgToolsPerSession!: number;
}

export class ToolEfficiencyDto {
    toolName!: string;
    totalCalls!: number;
    successRate!: number;
    avgDurationMs!: number;
    retryRate!: number;
    errorRate!: number;
}

export class RetentionPointDto {
    date!: string;
    uniqueAgents!: number;
    totalSessions!: number;
    returningAgents!: number;
    retentionRate!: number;
}

export class SessionListItemDto {
    id!: string;
    traceId!: string;
    model!: string | null;
    status!: string;
    totalInputTokens!: number;
    totalOutputTokens!: number;
    totalCostUsd!: number;
    toolCallsCount!: number;
    loopDetected!: boolean;
    startedAt!: Date;
    endedAt!: Date | null;
}
