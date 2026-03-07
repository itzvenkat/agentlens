import {
    Entity,
    Column,
    CreateDateColumn,
    Index,
    PrimaryColumn,
} from 'typeorm';

@Entity('daily_aggregates')
@Index(['projectId', 'date'], { unique: true })
export class DailyAggregate {
    @PrimaryColumn({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @PrimaryColumn({ type: 'date' })
    date!: string;

    @Column({ type: 'int', default: 0, name: 'total_sessions' })
    totalSessions!: number;

    @Column({ type: 'int', default: 0, name: 'success_count' })
    successCount!: number;

    @Column({ type: 'int', default: 0, name: 'failure_count' })
    failureCount!: number;

    @Column({ type: 'int', default: 0, name: 'loop_count' })
    loopCount!: number;

    @Column({ type: 'bigint', default: 0, name: 'total_input_tokens' })
    totalInputTokens!: number;

    @Column({ type: 'bigint', default: 0, name: 'total_output_tokens' })
    totalOutputTokens!: number;

    @Column({ type: 'decimal', precision: 14, scale: 6, default: 0, name: 'total_cost_usd' })
    totalCostUsd!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'avg_tools_per_session' })
    avgToolsPerSession!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'avg_duration_ms' })
    avgDurationMs!: number;

    @Column({ type: 'int', default: 0, name: 'unique_agents' })
    uniqueAgents!: number;

    @CreateDateColumn({ name: 'computed_at' })
    computedAt!: Date;
}
