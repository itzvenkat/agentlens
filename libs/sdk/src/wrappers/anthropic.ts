/**
 * Anthropic wrapper — auto-instruments messages.create with tool_use detection.
 */

import { AgentLensClient } from '../client';

/**
 * Wrap an Anthropic client to automatically trace LLM calls and tool usage.
 *
 * Usage:
 *   import Anthropic from '@anthropic-ai/sdk';
 *   import { AgentLensClient } from '@itzvenkat0/agentlens-sdk';
 *   import { wrapAnthropic } from '@itzvenkat0/agentlens-sdk/wrappers/anthropic';
 *
 *   const lens = new AgentLensClient({ apiKey: 'al_...' });
 *   const anthropic = wrapAnthropic(lens, new Anthropic());
 */
export function wrapAnthropic<T extends object>(
    client: AgentLensClient,
    anthropic: T,
    traceId?: string,
): T {
    const trace = client.trace(traceId);

    const messages = (anthropic as any)?.messages;
    if (!messages?.create) return anthropic;

    const originalCreate = messages.create.bind(messages);

    messages.create = async function wrappedCreate(...args: any[]) {
        const params = args[0] || {};
        const span = trace.span('llm', 'messages.create');

        try {
            const result = await originalCreate(...args);

            // Record LLM span completion
            span.end({
                model: params.model,
                provider: 'anthropic',
                inputTokens: result.usage?.input_tokens,
                outputTokens: result.usage?.output_tokens,
                status: result.stop_reason === 'end_turn' || result.stop_reason === 'tool_use' ? 'ok' : result.stop_reason,
            });

            // Auto-detect tool_use content blocks
            const content = result.content || [];
            for (const block of content) {
                if (block.type === 'tool_use') {
                    const toolSpan = trace.span('tool', block.name, span.spanId);
                    toolSpan.end({
                        toolName: block.name,
                        toolInputPreview: block.input as Record<string, unknown>,
                        toolOutputStatus: 'pending', // actual execution happens downstream
                        provider: 'anthropic',
                        model: params.model,
                    });
                }
            }

            return result;
        } catch (error) {
            span.end({
                model: params.model,
                provider: 'anthropic',
                status: 'error',
                attributes: { error: (error as Error).message },
            });
            throw error;
        }
    };

    // Also wrap messages.stream if available
    if (messages.stream) {
        const originalStream = messages.stream.bind(messages);

        messages.stream = function wrappedStream(...args: any[]) {
            const params = args[0] || {};
            const span = trace.span('llm', 'messages.stream');
            const stream = originalStream(...args);

            // Wrap the finalMessage() or on('end') to capture usage
            const originalFinalMessage = stream.finalMessage?.bind(stream);
            if (originalFinalMessage) {
                stream.finalMessage = async function () {
                    const result = await originalFinalMessage();
                    span.end({
                        model: params.model,
                        provider: 'anthropic',
                        inputTokens: result.usage?.input_tokens,
                        outputTokens: result.usage?.output_tokens,
                        status: 'ok',
                    });

                    // Detect tool_use blocks in streamed response
                    const content = result.content || [];
                    for (const block of content) {
                        if (block.type === 'tool_use') {
                            const toolSpan = trace.span('tool', block.name, span.spanId);
                            toolSpan.end({
                                toolName: block.name,
                                toolInputPreview: block.input as Record<string, unknown>,
                                toolOutputStatus: 'pending',
                                provider: 'anthropic',
                                model: params.model,
                            });
                        }
                    }

                    return result;
                };
            }

            return stream;
        };
    }

    return anthropic;
}
