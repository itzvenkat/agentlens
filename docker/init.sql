-- AgentLens database schema
-- Runs on first Docker container creation. TypeORM migrations handle subsequent changes.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description VARCHAR(500),
    api_key_hash VARCHAR(128) UNIQUE NOT NULL,
    api_key_prefix VARCHAR(16) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    trace_id VARCHAR(128) NOT NULL,
    parent_trace_id VARCHAR(64),
    model VARCHAR(128),
    provider VARCHAR(128),
    status VARCHAR(32) DEFAULT 'active',
    total_input_tokens INT DEFAULT 0,
    total_output_tokens INT DEFAULT 0,
    total_cost_usd DECIMAL(12, 6) DEFAULT 0,
    tool_calls_count INT DEFAULT 0,
    llm_calls_count INT DEFAULT 0,
    loop_detected BOOLEAN DEFAULT false,
    metadata JSONB,
    error_message VARCHAR(500),
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS spans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    parent_span_id UUID,
    span_id VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL,
    name VARCHAR(255),
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    duration_ms INT,
    status VARCHAR(32) DEFAULT 'ok',
    attributes JSONB,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tool_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    span_id UUID NOT NULL REFERENCES spans(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    tool_input_hash VARCHAR(64),
    output_status VARCHAR(32) NOT NULL,
    is_retry BOOLEAN DEFAULT false,
    retry_count INT DEFAULT 0,
    duration_ms INT,
    input_preview JSONB,
    output_preview JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) DEFAULT 'info',
    message VARCHAR(500),
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_aggregates (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_sessions INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    loop_count INT DEFAULT 0,
    total_input_tokens BIGINT DEFAULT 0,
    total_output_tokens BIGINT DEFAULT 0,
    total_cost_usd DECIMAL(14, 6) DEFAULT 0,
    avg_tools_per_session DECIMAL(10, 2) DEFAULT 0,
    avg_duration_ms DECIMAL(10, 2) DEFAULT 0,
    unique_agents INT DEFAULT 0,
    computed_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (project_id, date)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_sessions_project ON agent_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_trace ON agent_sessions(trace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON agent_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_spans_session ON spans(session_id);
CREATE INDEX IF NOT EXISTS idx_spans_span_id ON spans(span_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_span ON tool_calls(span_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_name ON tool_calls(tool_name);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_projects_api_key ON projects(api_key_hash);
