import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyAggregate, AgentSession } from '@agentlens/common';

@Injectable()
export class AggregationService {
    private readonly logger = new Logger(AggregationService.name);

    constructor(
        @InjectRepository(DailyAggregate)
        private readonly aggregateRepo: Repository<DailyAggregate>,
        @InjectRepository(AgentSession)
        private readonly sessionRepo: Repository<AgentSession>,
    ) { }

    /**
     * Runs every hour to compute/update daily aggregates.
     * Uses UPSERT to handle re-runs gracefully.
     */
    @Cron(CronExpression.EVERY_HOUR)
    async computeDailyAggregates(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        this.logger.log(`Computing daily aggregates for ${today}...`);

        const results = await this.sessionRepo.query(
            `SELECT
        project_id,
        $1::date as date,
        COUNT(*)::int as total_sessions,
        COUNT(*) FILTER (WHERE status = 'success')::int as success_count,
        COUNT(*) FILTER (WHERE status = 'failure')::int as failure_count,
        COUNT(*) FILTER (WHERE loop_detected = true)::int as loop_count,
        COALESCE(SUM(total_input_tokens), 0)::bigint as total_input_tokens,
        COALESCE(SUM(total_output_tokens), 0)::bigint as total_output_tokens,
        COALESCE(SUM(total_cost_usd), 0)::decimal as total_cost_usd,
        COALESCE(AVG(tool_calls_count), 0)::decimal as avg_tools_per_session,
        COALESCE(AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000), 0)::decimal as avg_duration_ms,
        COUNT(DISTINCT trace_id)::int as unique_agents
      FROM agent_sessions
      WHERE started_at::date = $1::date
      GROUP BY project_id`,
            [today],
        );

        for (const row of results) {
            await this.aggregateRepo.upsert(
                {
                    projectId: row.project_id,
                    date: today,
                    totalSessions: row.total_sessions,
                    successCount: row.success_count,
                    failureCount: row.failure_count,
                    loopCount: row.loop_count,
                    totalInputTokens: row.total_input_tokens,
                    totalOutputTokens: row.total_output_tokens,
                    totalCostUsd: row.total_cost_usd,
                    avgToolsPerSession: row.avg_tools_per_session,
                    avgDurationMs: row.avg_duration_ms,
                    uniqueAgents: row.unique_agents,
                },
                ['projectId', 'date'],
            );
        }

        this.logger.log(`Daily aggregates computed for ${results.length} projects`);
    }
}
