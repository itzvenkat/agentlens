import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
    AgentSession,
    Span,
    ToolCall,
    TelemetryEvent,
    IngestBatchDto,
    SpanEventDto,
    QUEUE_NAMES,
    SPAN_TYPES,
    TelemetryIngestResult,
} from '@itzvenkat0/agentlens-common';
import { PricingService } from '../processor/pricing.service';

@Injectable()
export class IngestService {
    private readonly logger = new Logger(IngestService.name);

    constructor(
        @InjectRepository(AgentSession)
        private readonly sessionRepo: Repository<AgentSession>,
        @InjectRepository(Span)
        private readonly spanRepo: Repository<Span>,
        @InjectRepository(ToolCall)
        private readonly toolCallRepo: Repository<ToolCall>,
        @InjectRepository(TelemetryEvent)
        private readonly eventRepo: Repository<TelemetryEvent>,
        @InjectQueue(QUEUE_NAMES.TELEMETRY)
        private readonly telemetryQueue: Queue,
        private readonly pricingService: PricingService,
    ) { }

    async ingestBatch(
        projectId: string,
        dto: IngestBatchDto,
    ): Promise<TelemetryIngestResult> {
        let accepted = 0;
        let rejected = 0;

        // Resolve or create session
        const traceId = dto.spans[0]?.traceId;
        if (!traceId) {
            return { accepted: 0, rejected: dto.spans.length, sessionId: '', traceId: '' };
        }

        let session = await this.sessionRepo.findOne({
            where: { projectId, traceId },
        });

        if (!session) {
            session = this.sessionRepo.create({
                projectId,
                traceId,
                model: dto.spans[0]?.model || null,
                provider: dto.spans[0]?.provider || null,
                status: 'active',
                metadata: dto.sessionMeta || null,
            });
            session = await this.sessionRepo.save(session);
            this.logger.log(`New session created: ${session.id} (trace: ${traceId})`);
        }

        // Persist spans and update session model if null/Unknown
        for (const spanDto of dto.spans) {
            try {
                // Dynamic model enrichment: if session has no model, attempt to take it from the span
                if ((!session.model || session.model === 'Unknown') && spanDto.model) {
                    session.model = spanDto.model;
                    session.provider = spanDto.provider || session.provider;
                    await this.sessionRepo.update(session.id, {
                        model: session.model,
                        provider: session.provider
                    });
                }

                const span = await this.persistSpan(session.id, spanDto);

                // If it's a tool span, also persist tool call record
                if (spanDto.type === SPAN_TYPES.TOOL && spanDto.toolName) {
                    await this.persistToolCall(span.id, spanDto);
                }

                accepted++;
            } catch (err) {
                this.logger.error(`Failed to persist span: ${(err as Error).message}`);
                rejected++;
            }
        }

        // Update session counters
        await this.updateSessionCounters(session.id);

        // Queue async processing (loop detection, aggregation)
        await this.telemetryQueue.add('process-batch', {
            sessionId: session.id,
            projectId,
        });

        return {
            accepted,
            rejected,
            sessionId: session.id,
            traceId,
        };
    }

    private async persistSpan(sessionId: string, dto: SpanEventDto): Promise<Span> {
        const span = this.spanRepo.create({
            sessionId,
            spanId: dto.spanId,
            parentSpanId: dto.parentSpanId || null,
            type: dto.type,
            name: dto.name || null,
            inputTokens: dto.inputTokens || 0,
            outputTokens: dto.outputTokens || 0,
            durationMs: dto.durationMs || null,
            status: dto.status || 'ok',
            attributes: dto.attributes || null,
            startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
            endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
        });
        return this.spanRepo.save(span);
    }

    private async persistToolCall(spanId: string, dto: SpanEventDto): Promise<ToolCall> {
        const inputHash = dto.toolInputHash || (
            dto.toolInputPreview
                ? createHash('md5').update(JSON.stringify(dto.toolInputPreview)).digest('hex').substring(0, 16)
                : null
        );

        const toolCall = this.toolCallRepo.create({
            spanId,
            toolName: dto.toolName!,
            toolInputHash: inputHash,
            outputStatus: dto.toolOutputStatus || 'success',
            isRetry: dto.isRetry || false,
            retryCount: 0,
            durationMs: dto.durationMs || null,
            inputPreview: dto.toolInputPreview || null,
            outputPreview: dto.toolOutputPreview || null,
        });
        return this.toolCallRepo.save(toolCall);
    }

    private async updateSessionCounters(sessionId: string): Promise<void> {
        const [spanCounts] = await this.spanRepo.query(
            `SELECT
        COALESCE(SUM(input_tokens), 0)::int as total_input,
        COALESCE(SUM(output_tokens), 0)::int as total_output,
        COUNT(*) FILTER (WHERE type = 'tool') as tool_count,
        COUNT(*) FILTER (WHERE type = 'llm') as llm_count
      FROM spans WHERE session_id = $1`,
            [sessionId],
        );

        const inputTokens = parseInt(spanCounts.total_input, 10);
        const outputTokens = parseInt(spanCounts.total_output, 10);

        // Calculate dynamic USD cost based on model tokens
        const session = await this.sessionRepo.findOne({ select: ['id', 'model'], where: { id: sessionId } });
        const costUsd = this.pricingService.calculateCost(session?.model || null, inputTokens, outputTokens);

        await this.sessionRepo.update(sessionId, {
            totalInputTokens: inputTokens,
            totalOutputTokens: outputTokens,
            totalCostUsd: costUsd,
            toolCallsCount: parseInt(spanCounts.tool_count, 10),
            llmCallsCount: parseInt(spanCounts.llm_count, 10),
        });
    }

    async endSession(
        projectId: string,
        sessionId: string,
        status: string,
        errorMessage?: string,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        await this.sessionRepo.update(
            { id: sessionId, projectId },
            {
                status,
                endedAt: new Date(),
                errorMessage: errorMessage || null,
                metadata: (metadata || null) as any,
            },
        );

        // Emit session_ended event
        await this.eventRepo.save(
            this.eventRepo.create({
                sessionId,
                type: 'session_ended',
                severity: status === 'success' ? 'info' : 'warning',
                message: `Session ended with status: ${status}`,
                payload: { status, errorMessage },
            }),
        );

        this.logger.log(`Session ended: ${sessionId} → ${status}`);
    }

    async getInterventionStatus(projectId: string, traceId: string): Promise<{ status: string; hint: string | null; sessionId: string } | null> {
        const session = await this.sessionRepo.findOne({
            select: ['id', 'interventionStatus', 'interventionHint'],
            where: { traceId, projectId }
        });

        if (!session) return null;

        return {
            status: session.interventionStatus,
            hint: session.interventionHint,
            sessionId: session.id,
        };
    }

    async resolveIntervention(projectId: string, sessionId: string, hint: string): Promise<void> {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId, projectId } });
        if (!session) {
            throw new Error('Session not found or project mismatch');
        }

        await this.sessionRepo.update(sessionId, {
            interventionStatus: 'resolved',
            interventionHint: hint,
        });

        this.logger.log(`Intervention resolved for session ${sessionId} (Project: ${projectId}) with hint: "${hint}"`);
    }
}
