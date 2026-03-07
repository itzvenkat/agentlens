import {
    Controller,
    Post,
    Body,
    Req,
    UseInterceptors,
    HttpCode,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { IngestService } from './ingest.service';
import { IngestBatchDto, EndSessionDto } from '@agentlens/common';
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
}
