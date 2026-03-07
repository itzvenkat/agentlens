import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/api-key.guard';

@Controller('health')
export class HealthController {
    @Public()
    @Get()
    check() {
        return {
            status: 'ok',
            service: 'agentlens-api',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    }
}
