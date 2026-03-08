/**
 * OpenAI wrapper — auto-instruments chat.completions.create with tool call detection.
 */

import { AgentLensClient } from '../client';
import { Trace } from '../trace';

/**
 * Wrap an OpenAI client to automatically trace LLM calls and tool usage.
 *
 * Usage:
 *   import OpenAI from 'openai';
 *   import { AgentLensClient } from '@itzvenkat0/agentlens-sdk';
 *   import { wrapOpenAI } from '@itzvenkat0/agentlens-sdk/wrappers/openai';
 *
 *   const lens = new AgentLensClient({ apiKey: 'al_...' });
 *   const openai = wrapOpenAI(lens, new OpenAI());
 */
export function wrapOpenAI<T extends object>(
    client: AgentLensClient,
    openai: T,
    traceId?: string,
): T {
    const trace = client.trace(traceId);

    const chatCompletions = (openai as any)?.chat?.completions;
    if (!chatCompletions?.create) return openai;

    const originalCreate = chatCompletions.create.bind(chatCompletions);

    chatCompletions.create = async function wrappedCreate(...args: any[]) {
        const params = args[0] || {};
        const span = trace.span('llm', 'chat.completions.create');

        try {
            const result = await originalCreate(...args);

            // Record LLM span completion
            span.end({
                model: params.model,
                provider: 'openai',
                inputTokens: result.usage?.prompt_tokens,
                outputTokens: result.usage?.completion_tokens,
                status: 'ok',
            });

            // Auto-detect tool calls in response
            const choices = result.choices || [];
            for (const choice of choices) {
                const toolCalls = choice.message?.tool_calls || [];
                for (const toolCall of toolCalls) {
                    if (toolCall.type === 'function') {
                        const toolSpan = trace.span('tool', toolCall.function.name, span.spanId);
                        let inputPreview: Record<string, unknown> | undefined;
                        try {
                            inputPreview = JSON.parse(toolCall.function.arguments);
                        } catch {
                            // arguments might not be valid JSON
                        }
                        toolSpan.end({
                            toolName: toolCall.function.name,
                            toolInputPreview: inputPreview,
                            toolOutputStatus: 'pending', // actual execution happens downstream
                            provider: 'openai',
                            model: params.model,
                        });
                    }
                }
            }

            return result;
        } catch (error) {
            span.end({
                model: params.model,
                provider: 'openai',
                status: 'error',
                attributes: { error: (error as Error).message },
            });
            throw error;
        }
    };

    return openai;
}
