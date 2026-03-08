import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import {
    envValidationSchema,
    appConfig,
    databaseConfig,
    redisConfig,
    authConfig,
    processorConfig,
} from './config/configuration';

import { ApiKeyGuard } from './auth/api-key.guard';
import { AuthModule } from './auth/auth.module';
import { IngestModule } from './ingest/ingest.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ProcessorModule } from './processor/processor.module';
import { HealthModule } from './health/health.module';

import {
    Project,
    AgentSession,
    Span,
    ToolCall,
    TelemetryEvent,
    DailyAggregate,
} from '@itzvenkat0/agentlens-common';

@Module({
    imports: [
        // ── Config ──
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
            load: [appConfig, databaseConfig, redisConfig, authConfig, processorConfig],
            validationSchema: envValidationSchema,
            validationOptions: {
                abortEarly: true,
                allowUnknown: true,
            },
        }),

        // ── Database ──
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const isProd = config.get<string>('app.nodeEnv') === 'production';
                const syncRequested = config.get<boolean>('database.synchronize');

                // DEFAULT: Never synchronize by default in any environment.
                // Migrations are now the source of truth everywhere.
                // OVERRIDE: Allow synchronization only in non-production if explicitly requested.
                const synchronize = !isProd && !!syncRequested;

                return {
                    type: 'postgres' as const,
                    host: config.get<string>('database.host'),
                    port: config.get<number>('database.port'),
                    username: config.get<string>('database.username'),
                    password: config.get<string>('database.password'),
                    database: config.get<string>('database.database'),
                    synchronize,
                    logging: config.get<boolean>('database.logging'),
                    ssl: config.get<boolean>('database.ssl')
                        ? { rejectUnauthorized: false }
                        : false,
                    entities: [Project, AgentSession, Span, ToolCall, TelemetryEvent, DailyAggregate],
                    autoLoadEntities: true,
                };
            },
        }),

        // ── Redis / BullMQ ──
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                connection: {
                    host: config.get<string>('redis.host'),
                    port: config.get<number>('redis.port'),
                    password: config.get<string>('redis.password') || undefined,
                    db: config.get<number>('redis.db'),
                },
            }),
        }),

        // ── Scheduler ──
        ScheduleModule.forRoot(),

        // ── Feature Modules ──
        AuthModule,
        IngestModule,
        AnalyticsModule,
        ProcessorModule,
        HealthModule,
    ],
    providers: [
        // Global API key guard
        {
            provide: APP_GUARD,
            useExisting: ApiKeyGuard,
        },
    ],
})
export class AppModule { }
