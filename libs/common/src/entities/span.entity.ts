import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { AgentSession } from './agent-session.entity';

@Entity('spans')
export class Span {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column({ type: 'uuid', name: 'session_id' })
    sessionId!: string;

    @ManyToOne(() => AgentSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session!: AgentSession;

    @Column({ type: 'uuid', nullable: true, name: 'parent_span_id' })
    parentSpanId!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 128, name: 'span_id' })
    spanId!: string;

    @Column({ type: 'varchar', length: 32 })
    type!: string; // 'llm' | 'tool' | 'system'

    @Column({ type: 'varchar', length: 255, nullable: true })
    name!: string | null;

    @Column({ type: 'int', default: 0, name: 'input_tokens' })
    inputTokens!: number;

    @Column({ type: 'int', default: 0, name: 'output_tokens' })
    outputTokens!: number;

    @Column({ type: 'int', nullable: true, name: 'duration_ms' })
    durationMs!: number | null;

    @Column({ type: 'varchar', length: 32, default: 'ok' })
    status!: string;

    @Column({ type: 'jsonb', nullable: true })
    attributes!: Record<string, unknown> | null;

    @CreateDateColumn({ name: 'started_at' })
    startedAt!: Date;

    @Column({ type: 'timestamptz', nullable: true, name: 'ended_at' })
    endedAt!: Date | null;
}
