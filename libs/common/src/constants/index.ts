// ── libs/common/src/constants/index.ts ──
// Central constants for the AgentLens platform

export const QUEUE_NAMES = {
    TELEMETRY: 'telemetry',
    AGGREGATION: 'aggregation',
} as const;

export const SPAN_TYPES = {
    LLM: 'llm',
    TOOL: 'tool',
    SYSTEM: 'system',
} as const;

export const SESSION_STATUS = {
    ACTIVE: 'active',
    SUCCESS: 'success',
    FAILURE: 'failure',
    TIMEOUT: 'timeout',
    LOOP_DETECTED: 'loop_detected',
} as const;

export const EVENT_TYPES = {
    ERROR: 'error',
    USER_FEEDBACK: 'user_feedback',
    LOOP_DETECTED: 'loop_detected',
    BUDGET_EXCEEDED: 'budget_exceeded',
    SPAN_CREATED: 'span_created',
    SESSION_ENDED: 'session_ended',
} as const;

export const TOOL_OUTPUT_STATUS = {
    SUCCESS: 'success',
    ERROR: 'error',
    TIMEOUT: 'timeout',
    HALLUCINATION: 'hallucination',
} as const;

export type SpanType = (typeof SPAN_TYPES)[keyof typeof SPAN_TYPES];
export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];
export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
export type ToolOutputStatus = (typeof TOOL_OUTPUT_STATUS)[keyof typeof TOOL_OUTPUT_STATUS];
