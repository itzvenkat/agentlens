import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('agent_sessions')
export class AgentSession {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @ManyToOne(() => Project, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'project_id' })
    project!: Project;

    @Index()
    @Column({ type: 'varchar', length: 128, name: 'trace_id' })
    traceId!: string;

    @Column({ type: 'varchar', length: 64, nullable: true, name: 'parent_trace_id' })
    parentTraceId!: string | null;

    @Column({ type: 'varchar', length: 128, nullable: true })
    model!: string | null;

    @Column({ type: 'varchar', length: 128, nullable: true })
    provider!: string | null;

    @Column({ type: 'varchar', length: 32, default: 'active' })
    status!: string;

    @Column({ type: 'int', default: 0, name: 'total_input_tokens' })
    totalInputTokens!: number;

    @Column({ type: 'int', default: 0, name: 'total_output_tokens' })
    totalOutputTokens!: number;

    @Column({ type: 'decimal', precision: 12, scale: 6, default: 0, name: 'total_cost_usd' })
    totalCostUsd!: number;

    @Column({ type: 'int', default: 0, name: 'tool_calls_count' })
    toolCallsCount!: number;

    @Column({ type: 'int', default: 0, name: 'llm_calls_count' })
    llmCallsCount!: number;

    @Column({ type: 'boolean', default: false, name: 'loop_detected' })
    loopDetected!: boolean;

    @Column({ type: 'varchar', length: 32, default: 'none', name: 'intervention_status' })
    interventionStatus!: string; // 'none' | 'pending' | 'resolved'

    @Column({ type: 'text', nullable: true, name: 'intervention_hint' })
    interventionHint!: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata!: Record<string, unknown> | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'error_message' })
    errorMessage!: string | null;

    @CreateDateColumn({ name: 'started_at' })
    startedAt!: Date;

    @Column({ type: 'timestamptz', nullable: true, name: 'ended_at' })
    endedAt!: Date | null;
}
