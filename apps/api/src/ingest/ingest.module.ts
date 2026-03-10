import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { AgentSession, Span, ToolCall, TelemetryEvent, Project } from '@itzvenkat0/agentlens-common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { QUEUE_NAMES } from '@itzvenkat0/agentlens-common';
import { ProcessorModule } from '../processor/processor.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AgentSession, Span, ToolCall, TelemetryEvent, Project]),
        BullModule.registerQueue({ name: QUEUE_NAMES.TELEMETRY }),
        ProcessorModule,
    ],
    controllers: [IngestController],
    providers: [IngestService, ApiKeyGuard],
})
export class IngestModule { }
