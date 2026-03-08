import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_URL = process.env.AGENTLENS_API_URL || 'http://localhost:3000';
const API_KEY = process.env.AGENTLENS_API_KEY || '';

/**
 * AgentLens MCP Server
 * 
 * Exposes observability tools that agents can call to report their own progress.
 * This allows any MCP-compatible agent to self-instrument without SDK integration.
 */
const server = new McpServer({
    name: 'agentlens',
    version: '0.1.0',
});

// ── Helper: Forward to AgentLens API ──
async function forwardToApi(path: string, body: unknown): Promise<unknown> {
    const response = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`AgentLens API error (${response.status}): ${text}`);
    }

    return response.json();
}

// ── Tool: report_progress ──
// @ts-expect-error - MCP SDK Zod type inference is excessively deep
server.tool(
    'report_progress',
    'Report an intermediate step in your task execution (span start/end, tool call, LLM call)',
    {
        traceId: z.string().describe('Unique trace ID for this task/conversation'),
        spanId: z.string().describe('Unique span ID for this step'),
        parentSpanId: z.string().optional().describe('Parent span ID if nested'),
        type: z.enum(['llm', 'tool', 'system']).describe('Type of step'),
        name: z.string().optional().describe('Human-readable name of this step'),
        model: z.string().optional().describe('LLM model used (e.g., claude-3.5-sonnet)'),
        provider: z.string().optional().describe('Provider (e.g., anthropic, openai)'),
        inputTokens: z.number().optional().describe('Input tokens consumed'),
        outputTokens: z.number().optional().describe('Output tokens generated'),
        durationMs: z.number().optional().describe('Duration in milliseconds'),
        status: z.string().optional().describe('Status: ok, error, timeout'),
        toolName: z.string().optional().describe('Tool name if type=tool'),
        toolOutputStatus: z.string().optional().describe('Tool output status: success, error, timeout'),
    },
    async (params) => {
        try {
            const result = await forwardToApi('/v1/ingest', {
                spans: [params],
            });
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `✅ Progress reported: ${params.type} span "${params.name || params.spanId}" recorded.`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `❌ Failed to report progress: ${(error as Error).message}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// ── Tool: report_result ──
// @ts-expect-error - MCP SDK Zod type inference is excessively deep
server.tool(
    'report_result',
    'Report the final outcome of a task (success or failure)',
    {
        sessionId: z.string().describe('Session ID from a previous report_progress call'),
        status: z.enum(['success', 'failure', 'timeout']).describe('Final task status'),
        errorMessage: z.string().optional().describe('Error message if failed'),
        metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
    },
    async (params) => {
        try {
            await forwardToApi('/v1/ingest/end-session', params);
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `✅ Session ${params.sessionId} ended with status: ${params.status}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `❌ Failed to report result: ${(error as Error).message}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// ── Tool: report_error ──
// @ts-expect-error - MCP SDK Zod type inference is excessively deep
server.tool(
    'report_error',
    'Report an error or exception encountered during task execution',
    {
        traceId: z.string().describe('Trace ID of the current task'),
        spanId: z.string().describe('Span ID where the error occurred'),
        errorType: z.string().describe('Error type/class name'),
        errorMessage: z.string().describe('Error message'),
        severity: z.enum(['warning', 'error', 'critical']).default('error').describe('Error severity'),
        context: z.record(z.unknown()).optional().describe('Additional error context'),
    },
    async (params) => {
        try {
            await forwardToApi('/v1/ingest', {
                spans: [
                    {
                        traceId: params.traceId,
                        spanId: params.spanId,
                        type: 'system',
                        name: `error:${params.errorType}`,
                        status: 'error',
                        attributes: {
                            errorType: params.errorType,
                            errorMessage: params.errorMessage,
                            severity: params.severity,
                            ...params.context,
                        },
                    },
                ],
            });
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `✅ Error reported: ${params.errorType} — "${params.errorMessage}"`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `❌ Failed to report error: ${(error as Error).message}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// ── Resource: Dashboard link ──
server.resource(
    'dashboard',
    'agentlens://dashboard',
    async (uri) => ({
        contents: [
            {
                uri: uri.href,
                mimeType: 'text/plain',
                text: `AgentLens Dashboard: ${API_URL.replace(':3000', ':3001')}\n\nView your agent analytics, tool efficiency, and session traces.`,
            },
        ],
    }),
);

// ── Bootstrap ──
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('AgentLens MCP server ready');
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
