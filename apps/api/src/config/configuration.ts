import * as Joi from 'joi';
import { registerAs } from '@nestjs/config';

// ── Env validation schema (fail-fast on bad config) ─────
export const envValidationSchema = Joi.object({
    // App
    NODE_ENV: Joi.string().valid('development', 'staging', 'production').default('development'),
    APP_PORT: Joi.number().default(3000),
    APP_NAME: Joi.string().default('agentlens'),
    APP_VERSION: Joi.string().default('0.1.0'),
    APP_LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('debug'),
    APP_CORS_ORIGINS: Joi.string().default('http://localhost:3001'),

    // Database
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(5432),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_DATABASE: Joi.string().required(),
    DB_SYNCHRONIZE: Joi.boolean().default(false),
    DB_LOGGING: Joi.boolean().default(false),
    DB_SSL: Joi.boolean().default(false),

    // Redis
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').default(''),
    REDIS_DB: Joi.number().default(0),

    // Auth
    MASTER_API_KEY: Joi.string().required(),

    // Processor
    LOOP_DETECTION_THRESHOLD: Joi.number().default(3),
    BATCH_FLUSH_INTERVAL_MS: Joi.number().default(5000),
    BATCH_FLUSH_SIZE: Joi.number().default(50),
});

// ── Namespaced configs ──────────────────────

export const appConfig = registerAs('app', () => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.APP_PORT || '3000', 10),
    name: process.env.APP_NAME || 'agentlens',
    version: process.env.APP_VERSION || '0.1.0',
    logLevel: process.env.APP_LOG_LEVEL || 'debug',
    corsOrigins: (process.env.APP_CORS_ORIGINS || 'http://localhost:3001').split(','),
}));

export const databaseConfig = registerAs('database', () => ({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DB_SSL === 'true',
}));

export const redisConfig = registerAs('redis', () => ({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
}));

export const authConfig = registerAs('auth', () => ({
    masterApiKey: process.env.MASTER_API_KEY,
}));

export const processorConfig = registerAs('processor', () => ({
    loopDetectionThreshold: parseInt(process.env.LOOP_DETECTION_THRESHOLD || '3', 10),
    batchFlushIntervalMs: parseInt(process.env.BATCH_FLUSH_INTERVAL_MS || '5000', 10),
    batchFlushSize: parseInt(process.env.BATCH_FLUSH_SIZE || '50', 10),
}));
