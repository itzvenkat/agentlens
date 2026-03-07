import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AgentSession, Span, ToolCall, TelemetryEvent, DailyAggregate } from '@agentlens/common';
import { ProcessorModule } from '../processor/processor.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AgentSession, Span, ToolCall, TelemetryEvent, DailyAggregate]),
        ProcessorModule,
    ],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
})
export class AnalyticsModule { }
