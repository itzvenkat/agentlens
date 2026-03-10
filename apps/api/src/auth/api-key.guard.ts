import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { Project } from '@itzvenkat0/agentlens-common';

export const IS_PUBLIC_KEY = 'isPublic';
import { SetMetadata } from '@nestjs/common';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class ApiKeyGuard implements CanActivate {
    private readonly logger = new Logger(ApiKeyGuard.name);

    constructor(
        @InjectRepository(Project)
        private readonly projectRepo: Repository<Project>,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check for @Public() decorator
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const request = context.switchToHttp().getRequest();
        const apiKey = (request.headers['x-api-key'] || request.query['apiKey']) as string;

        if (!apiKey) {
            throw new UnauthorizedException('Missing X-API-Key header');
        }

        const masterKey = process.env.AGENTLENS_MASTER_KEY || 'agentlens_master_dev_key';

        if (apiKey === masterKey) {
            // DEV BYPASS: Use the first available project
            const firstProject = await this.projectRepo.findOne({ where: { isActive: true }, order: { createdAt: 'ASC' } });
            if (firstProject) {
                this.logger.debug(`Master key bypass: using project ${firstProject.name} (${firstProject.id})`);
                request.project = firstProject;
                return true;
            }
            // Fallback if no projects exist (unlikely in dev)
            this.logger.warn('Master key used but no active projects found in database.');
        }

        // Hash the provided key and look up by hash
        const hash = createHash('sha256').update(apiKey).digest('hex');

        const project = await this.projectRepo.findOne({
            where: { apiKeyHash: hash, isActive: true },
        });

        if (!project) {
            this.logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 8)}...`);
            throw new UnauthorizedException('Invalid API key');
        }

        // Attach project to request for downstream use
        request.project = project;
        return true;
    }
}
