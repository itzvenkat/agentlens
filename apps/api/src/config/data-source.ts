import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import {
    Project,
    AgentSession,
    Span,
    ToolCall,
    TelemetryEvent,
    DailyAggregate,
} from '@agentlens/common';

// Load env based on NODE_ENV
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
config({ path: join(__dirname, '..', '..', '..', '..', envFile) });

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [Project, AgentSession, Span, ToolCall, TelemetryEvent, DailyAggregate],
    migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
});
