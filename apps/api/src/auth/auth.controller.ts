import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from './api-key.guard';
import { AuthService } from './auth.service';
import { CreateProjectDto } from '@agentlens/common';

@Controller('v1/projects')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) { }

    @Public()
    @Post()
    async createProject(
        @Body() dto: CreateProjectDto,
        @Headers('x-master-key') masterKey: string,
    ) {
        // Require master key for project creation
        const expectedKey = this.configService.get<string>('auth.masterApiKey');
        if (!masterKey || masterKey !== expectedKey) {
            throw new UnauthorizedException('Invalid master key');
        }
        return this.authService.createProject(dto);
    }

    @Public()
    @Get()
    async listProjects(@Headers('x-master-key') masterKey: string) {
        const expectedKey = this.configService.get<string>('auth.masterApiKey');
        if (!masterKey || masterKey !== expectedKey) {
            throw new UnauthorizedException('Invalid master key');
        }
        return this.authService.listProjects();
    }
}
