import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
    AgentSession,
    Span,
    ToolCall,
    DailyAggregate,
    OverviewDto,
    ToolEfficiencyDto,
    RetentionPointDto,
    SessionListItemDto,
    PaginatedResult,
} from '@itzvenkat0/agentlens-common';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(
        @InjectRepository(AgentSession)
        private readonly sessionRepo: Repository<AgentSession>,
        @InjectRepository(Span)
        private readonly spanRepo: Repository<Span>,
        @InjectRepository(ToolCall)
        private readonly toolCallRepo: Repository<ToolCall>,
        @InjectRepository(DailyAggregate)
        private readonly aggregateRepo: Repository<DailyAggregate>,
    ) { }

    async getOverview(projectId: string, from: Date, to: Date): Promise<OverviewDto> {
        const [result] = await this.sessionRepo.query(
            `SELECT
        COUNT(*)::int as total_sessions,
        COUNT(*) FILTER (WHERE status = 'success')::int as success_count,
        COALESCE(SUM(total_input_tokens + total_output_tokens), 0)::bigint as total_tokens,
        COALESCE(SUM(total_cost_usd), 0)::decimal as total_cost_usd,
        COUNT(*) FILTER (WHERE loop_detected = true)::int as loop_count,
        COALESCE(AVG(tool_calls_count), 0)::decimal as avg_tools_per_session
      FROM agent_sessions
      WHERE project_id = $1 AND started_at BETWEEN $2 AND $3`,
            [projectId, from, to],
        );

        const totalSessions = parseInt(result.total_sessions, 10);
        const successCount = parseInt(result.success_count, 10);
        const totalCostUsd = parseFloat(result.total_cost_usd);

        return {
            totalSessions,
            successRate: totalSessions > 0 ? (successCount / totalSessions) * 100 : 0,
            avgCostPerSession: totalSessions > 0 ? totalCostUsd / totalSessions : 0,
            avgCostPerSuccess: successCount > 0 ? totalCostUsd / successCount : 0,
            totalTokens: parseInt(result.total_tokens, 10),
            totalCostUsd,
            loopDetectionRate:
                totalSessions > 0 ? (parseInt(result.loop_count, 10) / totalSessions) * 100 : 0,
            avgToolsPerSession: parseFloat(result.avg_tools_per_session),
        };
    }

    async getSessions(
        projectId: string,
        page: number,
        pageSize: number,
    ): Promise<PaginatedResult<SessionListItemDto>> {
        const [sessions, total] = await this.sessionRepo.findAndCount({
            where: { projectId },
            order: { startedAt: 'DESC' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });

        return {
            data: sessions.map((s) => ({
                id: s.id,
                traceId: s.traceId,
                model: s.model,
                status: s.status,
                totalInputTokens: s.totalInputTokens,
                totalOutputTokens: s.totalOutputTokens,
                totalCostUsd: s.totalCostUsd,
                toolCallsCount: s.toolCallsCount,
                loopDetected: s.loopDetected,
                startedAt: s.startedAt,
                endedAt: s.endedAt,
            })),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    async getSessionTrace(projectId: string, sessionId: string): Promise<Span[]> {
        // Verify session belongs to project
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId, projectId },
        });

        if (!session) return [];

        return this.spanRepo.find({
            where: { sessionId },
            order: { startedAt: 'ASC' },
        });
    }

    async getToolEfficiency(projectId: string, from: Date, to: Date): Promise<ToolEfficiencyDto[]> {
        const results = await this.toolCallRepo.query(
            `SELECT
        tc.tool_name,
        COUNT(*)::int as total_calls,
        COUNT(*) FILTER (WHERE tc.output_status = 'success')::int as success_calls,
        COUNT(*) FILTER (WHERE tc.output_status = 'error')::int as error_calls,
        COUNT(*) FILTER (WHERE tc.is_retry = true)::int as retry_calls,
        COALESCE(AVG(tc.duration_ms), 0)::decimal as avg_duration_ms
      FROM tool_calls tc
      INNER JOIN spans s ON s.id = tc.span_id
      INNER JOIN agent_sessions a ON a.id = s.session_id
      WHERE a.project_id = $1 AND a.started_at BETWEEN $2 AND $3
      GROUP BY tc.tool_name
      ORDER BY total_calls DESC`,
            [projectId, from, to],
        );

        return results.map((r: any) => ({
            toolName: r.tool_name,
            totalCalls: r.total_calls,
            successRate: r.total_calls > 0 ? (r.success_calls / r.total_calls) * 100 : 0,
            avgDurationMs: parseFloat(r.avg_duration_ms),
            retryRate: r.total_calls > 0 ? (r.retry_calls / r.total_calls) * 100 : 0,
            errorRate: r.total_calls > 0 ? (r.error_calls / r.total_calls) * 100 : 0,
        }));
    }

    async getRetention(projectId: string, days: number): Promise<RetentionPointDto[]> {
        const results = await this.aggregateRepo.query(
            `SELECT
        date,
        unique_agents,
        total_sessions
      FROM daily_aggregates
      WHERE project_id = $1
      ORDER BY date DESC
      LIMIT $2`,
            [projectId, days],
        );

        // Calculate returning agents (appeared in previous day too)
        return results.reverse().map((r: any, i: number) => {
            const prev = i > 0 ? results[results.length - 1 - i + 1] : null;
            return {
                date: r.date,
                uniqueAgents: parseInt(r.unique_agents, 10),
                totalSessions: parseInt(r.total_sessions, 10),
                returningAgents: prev ? Math.min(parseInt(r.unique_agents, 10), parseInt(prev.unique_agents, 10)) : 0,
                retentionRate: prev && parseInt(prev.unique_agents, 10) > 0
                    ? (Math.min(parseInt(r.unique_agents, 10), parseInt(prev.unique_agents, 10)) / parseInt(prev.unique_agents, 10)) * 100
                    : 0,
            };
        });
    }
}
