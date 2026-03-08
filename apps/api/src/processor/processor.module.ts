import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TelemetryProcessor } from './telemetry.processor';
import { LoopDetectorService } from './loop-detector.service';
import { AggregationService } from './aggregation.service';
import { RLRewardService } from './rl-reward.service';
import { AgentSession, Span, ToolCall, TelemetryEvent, DailyAggregate } from '@itzvenkat0/agentlens-common';
import { QUEUE_NAMES } from '@itzvenkat0/agentlens-common';

@Module({
    imports: [
        TypeOrmModule.forFeature([AgentSession, Span, ToolCall, TelemetryEvent, DailyAggregate]),
        BullModule.registerQueue({ name: QUEUE_NAMES.TELEMETRY }),
    ],
    providers: [TelemetryProcessor, LoopDetectorService, AggregationService, RLRewardService],
    exports: [RLRewardService],
})
export class ProcessorModule { }
