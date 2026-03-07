import {
    Controller,
    Get,
    Param,
    Query,
    Req,
    Sse,
    MessageEvent,
    Logger,
} from '@nestjs/common';
import { Observable, interval, map } from 'rxjs';
import { AnalyticsService } from './analytics.service';
import { RLRewardService } from '../processor/rl-reward.service';

@Controller('v1/analytics')
export class AnalyticsController {
    private readonly logger = new Logger(AnalyticsController.name);

    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly rlRewardService: RLRewardService,
    ) { }

    @Get('rl-insights')
    getRLInsights() {
        return this.rlRewardService.getInsights();
    }

    @Get('overview')
    async getOverview(
        @Req() req: any,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        const projectId = req.project.id;
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        return this.analyticsService.getOverview(projectId, fromDate, toDate);
    }

    @Get('sessions')
    async getSessions(
        @Req() req: any,
        @Query('page') page: string = '1',
        @Query('pageSize') pageSize: string = '20',
    ) {
        return this.analyticsService.getSessions(
            req.project.id,
            parseInt(page, 10),
            parseInt(pageSize, 10),
        );
    }

    @Get('sessions/:sessionId/trace')
    async getSessionTrace(
        @Req() req: any,
        @Param('sessionId') sessionId: string,
    ) {
        return this.analyticsService.getSessionTrace(req.project.id, sessionId);
    }

    @Get('tools')
    async getToolEfficiency(
        @Req() req: any,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        return this.analyticsService.getToolEfficiency(req.project.id, fromDate, toDate);
    }

    @Get('retention')
    async getRetention(
        @Req() req: any,
        @Query('days') days: string = '30',
    ) {
        return this.analyticsService.getRetention(req.project.id, parseInt(days, 10));
    }

    /**
     * SSE endpoint for real-time dashboard updates.
     * Polls analytics every 10 seconds and pushes to connected clients.
     */
    @Sse('stream')
    streamUpdates(@Req() req: any): Observable<MessageEvent> {
        const projectId = req.project.id;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        return interval(10000).pipe(
            map(async () => {
                try {
                    const overview = await this.analyticsService.getOverview(projectId, thirtyDaysAgo, now);
                    return { data: overview } as MessageEvent;
                } catch {
                    return { data: { error: 'Failed to fetch updates' } } as MessageEvent;
                }
            }),
            map((promise) => {
                // Return a placeholder — the async data will be streamed
                return { data: { type: 'heartbeat', timestamp: new Date().toISOString() } } as MessageEvent;
            }),
        );
    }
}
