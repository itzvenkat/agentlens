import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { AgentSession, Span, ToolCall, TelemetryEvent } from '@agentlens/common';
import { QUEUE_NAMES } from '@agentlens/common';

@Module({
    imports: [
        TypeOrmModule.forFeature([AgentSession, Span, ToolCall, TelemetryEvent]),
        BullModule.registerQueue({ name: QUEUE_NAMES.TELEMETRY }),
    ],
    controllers: [IngestController],
    providers: [IngestService],
})
export class IngestModule { }
