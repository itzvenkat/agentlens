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

@Entity('events')
export class TelemetryEvent {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column({ type: 'uuid', name: 'session_id' })
    sessionId!: string;

    @ManyToOne(() => AgentSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session!: AgentSession;

    @Index()
    @Column({ type: 'varchar', length: 64 })
    type!: string;

    @Column({ type: 'varchar', length: 32, default: 'info' })
    severity!: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    message!: string | null;

    @Column({ type: 'jsonb', nullable: true })
    payload!: Record<string, unknown> | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
