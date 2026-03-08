import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial baseline migration — creates the full AgentLens schema.
 *
 * This migration captures the schema as it existed before migrations were
 * introduced. For existing databases, running this is a no-op thanks to
 * the TypeORM migrations table tracking. For fresh installs this creates
 * all tables from scratch.
 */
export class InitialSchema1709913600000 implements MigrationInterface {
    name = 'InitialSchema1709913600000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable uuid-ossp extension (idempotent)
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ── projects ──
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "projects" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar(255) NOT NULL,
                "description" varchar(500),
                "api_key_hash" varchar(128) NOT NULL,
                "api_key_prefix" varchar(16) NOT NULL,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_projects" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_projects_name" UNIQUE ("name"),
                CONSTRAINT "UQ_projects_api_key_hash" UNIQUE ("api_key_hash")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_projects_api_key_hash" ON "projects" ("api_key_hash")`);

        // ── agent_sessions ──
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "agent_sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "project_id" uuid NOT NULL,
                "trace_id" varchar(128) NOT NULL,
                "parent_trace_id" varchar(64),
                "model" varchar(128),
                "provider" varchar(128),
                "status" varchar(32) NOT NULL DEFAULT 'active',
                "total_input_tokens" integer NOT NULL DEFAULT 0,
                "total_output_tokens" integer NOT NULL DEFAULT 0,
                "total_cost_usd" numeric(12,6) NOT NULL DEFAULT 0,
                "tool_calls_count" integer NOT NULL DEFAULT 0,
                "llm_calls_count" integer NOT NULL DEFAULT 0,
                "loop_detected" boolean NOT NULL DEFAULT false,
                "metadata" jsonb,
                "error_message" varchar(500),
                "started_at" TIMESTAMP NOT NULL DEFAULT now(),
                "ended_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_agent_sessions" PRIMARY KEY ("id"),
                CONSTRAINT "FK_agent_sessions_project" FOREIGN KEY ("project_id")
                    REFERENCES "projects"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agent_sessions_project_id" ON "agent_sessions" ("project_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agent_sessions_trace_id" ON "agent_sessions" ("trace_id")`);

        // ── spans ──
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "spans" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "session_id" uuid NOT NULL,
                "parent_span_id" uuid,
                "span_id" varchar(128) NOT NULL,
                "type" varchar(32) NOT NULL,
                "name" varchar(255),
                "input_tokens" integer NOT NULL DEFAULT 0,
                "output_tokens" integer NOT NULL DEFAULT 0,
                "duration_ms" integer,
                "status" varchar(32) NOT NULL DEFAULT 'ok',
                "attributes" jsonb,
                "started_at" TIMESTAMP NOT NULL DEFAULT now(),
                "ended_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_spans" PRIMARY KEY ("id"),
                CONSTRAINT "FK_spans_session" FOREIGN KEY ("session_id")
                    REFERENCES "agent_sessions"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_spans_session_id" ON "spans" ("session_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_spans_span_id" ON "spans" ("span_id")`);

        // ── tool_calls ──
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tool_calls" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "span_id" uuid NOT NULL,
                "tool_name" varchar(255) NOT NULL,
                "tool_input_hash" varchar(64),
                "output_status" varchar(32) NOT NULL,
                "is_retry" boolean NOT NULL DEFAULT false,
                "retry_count" integer NOT NULL DEFAULT 0,
                "duration_ms" integer,
                "input_preview" jsonb,
                "output_preview" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tool_calls" PRIMARY KEY ("id"),
                CONSTRAINT "FK_tool_calls_span" FOREIGN KEY ("span_id")
                    REFERENCES "spans"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tool_calls_span_id" ON "tool_calls" ("span_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tool_calls_tool_name" ON "tool_calls" ("tool_name")`);

        // ── events (telemetry_events) ──
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "session_id" uuid NOT NULL,
                "type" varchar(64) NOT NULL,
                "severity" varchar(32) NOT NULL DEFAULT 'info',
                "message" varchar(500),
                "payload" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_events" PRIMARY KEY ("id"),
                CONSTRAINT "FK_events_session" FOREIGN KEY ("session_id")
                    REFERENCES "agent_sessions"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_events_session_id" ON "events" ("session_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_events_type" ON "events" ("type")`);

        // ── daily_aggregates ──
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "daily_aggregates" (
                "project_id" uuid NOT NULL,
                "date" date NOT NULL,
                "total_sessions" integer NOT NULL DEFAULT 0,
                "success_count" integer NOT NULL DEFAULT 0,
                "failure_count" integer NOT NULL DEFAULT 0,
                "loop_count" integer NOT NULL DEFAULT 0,
                "total_input_tokens" bigint NOT NULL DEFAULT 0,
                "total_output_tokens" bigint NOT NULL DEFAULT 0,
                "total_cost_usd" numeric(14,6) NOT NULL DEFAULT 0,
                "avg_tools_per_session" numeric(10,2) NOT NULL DEFAULT 0,
                "avg_duration_ms" numeric(10,2) NOT NULL DEFAULT 0,
                "unique_agents" integer NOT NULL DEFAULT 0,
                "computed_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_daily_aggregates" PRIMARY KEY ("project_id", "date")
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_daily_aggregates_project_date" ON "daily_aggregates" ("project_id", "date")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "daily_aggregates"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tool_calls"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "spans"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "agent_sessions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
    }
}
