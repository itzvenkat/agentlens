import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { Project, CreateProjectDto, ProjectResponseDto } from '@agentlens/common';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(Project)
        private readonly projectRepo: Repository<Project>,
    ) { }

    async createProject(dto: CreateProjectDto): Promise<ProjectResponseDto> {
        // Check for duplicate name
        const existing = await this.projectRepo.findOne({ where: { name: dto.name } });
        if (existing) {
            throw new ConflictException(`Project "${dto.name}" already exists`);
        }

        // Generate API key: prefix (visible) + secret
        const apiKey = `al_${randomUUID().replace(/-/g, '')}`;
        const apiKeyPrefix = apiKey.substring(0, 12);
        const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

        const project = this.projectRepo.create({
            name: dto.name,
            description: dto.description || null,
            apiKeyHash,
            apiKeyPrefix,
        });

        const saved = await this.projectRepo.save(project);
        this.logger.log(`Project created: ${saved.name} (${saved.id})`);

        return {
            id: saved.id,
            name: saved.name,
            description: saved.description,
            apiKeyPrefix,
            apiKey, // Only returned on creation — never stored in plaintext
            isActive: saved.isActive,
            createdAt: saved.createdAt,
        };
    }

    async listProjects(): Promise<ProjectResponseDto[]> {
        const projects = await this.projectRepo.find({
            order: { createdAt: 'DESC' },
        });

        return projects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            apiKeyPrefix: p.apiKeyPrefix,
            isActive: p.isActive,
            createdAt: p.createdAt,
        }));
    }
}
