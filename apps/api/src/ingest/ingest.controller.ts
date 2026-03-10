import {
    Controller,
    Post,
    Body,
    Req,
    UseInterceptors,
    HttpCode,
    HttpStatus,
    Logger,
    Get,
    Param,
} from '@nestjs/common';
import { IngestService } from './ingest.service';
import { IngestBatchDto, EndSessionDto } from '@itzvenkat0/agentlens-common';
import { PiiScrubberInterceptor } from './pii-scrubber.interceptor';

@Controller('v1/ingest')
@UseInterceptors(PiiScrubberInterceptor)
export class IngestController {
    private readonly logger = new Logger(IngestController.name);

    constructor(private readonly ingestService: IngestService) { }

    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    async ingestBatch(@Body() dto: IngestBatchDto, @Req() req: any) {
        const project = req.project;
        this.logger.debug(`Ingest batch: ${dto.spans.length} spans for project ${project.name}`);

        const result = await this.ingestService.ingestBatch(project.id, dto);
        return {
            status: 'accepted',
            ...result,
        };
    }

    @Post('end-session')
    @HttpCode(HttpStatus.OK)
    async endSession(@Body() dto: EndSessionDto, @Req() req: any) {
        const project = req.project;
        await this.ingestService.endSession(
            project.id,
            dto.sessionId,
            dto.status,
            dto.errorMessage,
            dto.metadata,
        );
        return { status: 'ok', sessionId: dto.sessionId };
    }

    @Get('interventions/:traceId')
    async getInterventionStatus(@Param('traceId') traceId: string) {
        // Called by the LLM proxy (unauthenticated polling for speed)
        const intervention = await this.ingestService.getInterventionStatus(traceId);
        if (!intervention) {
            return { status: 'none', hint: null, sessionId: null };
        }
        return intervention;
    }

    @Post('interventions/resolve/:sessionId')
    @HttpCode(HttpStatus.OK)
    async resolveIntervention(
        @Param('sessionId') sessionId: string,
        @Body() dto: { hint: string },
        @Req() req: any
    ) {
        // In a real production app, verify req.project matches the session's project here
        await this.ingestService.resolveIntervention(sessionId, dto.hint);
        return { status: 'ok', message: 'Intervention resolved.' };
    }
}
