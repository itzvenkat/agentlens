import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
} from 'typeorm';

@Entity('projects')
export class Project {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    name!: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    description!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 128, unique: true, name: 'api_key_hash' })
    apiKeyHash!: string;

    @Column({ type: 'varchar', length: 16, name: 'api_key_prefix' })
    apiKeyPrefix!: string;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
