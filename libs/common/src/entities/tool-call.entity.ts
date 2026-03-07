import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Span } from './span.entity';

@Entity('tool_calls')
export class ToolCall {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column({ type: 'uuid', name: 'span_id' })
    spanId!: string;

    @ManyToOne(() => Span, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'span_id' })
    span!: Span;

    @Index()
    @Column({ type: 'varchar', length: 255, name: 'tool_name' })
    toolName!: string;

    @Column({ type: 'varchar', length: 64, nullable: true, name: 'tool_input_hash' })
    toolInputHash!: string | null;

    @Column({ type: 'varchar', length: 32, name: 'output_status' })
    outputStatus!: string; // 'success' | 'error' | 'timeout' | 'hallucination'

    @Column({ type: 'boolean', default: false, name: 'is_retry' })
    isRetry!: boolean;

    @Column({ type: 'int', default: 0, name: 'retry_count' })
    retryCount!: number;

    @Column({ type: 'int', nullable: true, name: 'duration_ms' })
    durationMs!: number | null;

    @Column({ type: 'jsonb', nullable: true, name: 'input_preview' })
    inputPreview!: Record<string, unknown> | null;

    @Column({ type: 'jsonb', nullable: true, name: 'output_preview' })
    outputPreview!: Record<string, unknown> | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
