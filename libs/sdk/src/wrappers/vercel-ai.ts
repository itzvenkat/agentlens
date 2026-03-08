/**
 * Vercel AI SDK wrapper — auto-instruments generateText() and streamText().
 */

import { AgentLensClient } from '../client';

/**
 * Wrap Vercel AI SDK functions to automatically trace LLM calls and tool usage.
 *
 * Usage:
 *   import { generateText, streamText } from 'ai';
 *   import { AgentLensClient } from '@itzvenkat0/agentlens-sdk';
 *   import { wrapVercelAI } from '@itzvenkat0/agentlens-sdk/wrappers/vercel-ai';
 *
 *   const lens = new AgentLensClient({ apiKey: 'al_...' });
 *   const ai = wrapVercelAI(lens, { generateText, streamText });
 *   const result = await ai.generateText({ model: openai('gpt-4o'), prompt: '...' });
 */
export function wrapVercelAI(
    client: AgentLensClient,
    fns: {
        generateText?: (...args: any[]) => Promise<any>;
        streamText?: (...args: any[]) => any;
    },
    traceId?: string,
): {
    generateText: (...args: any[]) => Promise<any>;
    streamText: (...args: any[]) => any;
} {
    const trace = client.trace(traceId);

    const wrappedGenerateText = fns.generateText
        ? async function wrappedGenerateText(...args: any[]) {
            const params = args[0] || {};
            const modelId = extractModelId(params.model);
            const span = trace.span('llm', 'generateText');

            try {
                const result = await fns.generateText!(...args);

                span.end({
                    model: modelId,
                    provider: extractProvider(params.model),
                    inputTokens: result.usage?.promptTokens,
                    outputTokens: result.usage?.completionTokens,
                    status: 'ok',
                });

                // Auto-detect tool calls
                const toolCalls = result.toolCalls || [];
                for (const tc of toolCalls) {
                    const toolSpan = trace.span('tool', tc.toolName, span.spanId);
                    toolSpan.end({
                        toolName: tc.toolName,
                        toolInputPreview: tc.args as Record<string, unknown>,
                        toolOutputStatus: 'ok',
                        model: modelId,
                    });
                }

                // Auto-detect tool results
                const toolResults = result.toolResults || [];
                for (const tr of toolResults) {
                    const toolSpan = trace.span('tool', `${tr.toolName}.result`, span.spanId);
                    toolSpan.end({
                        toolName: tr.toolName,
                        toolOutputStatus: 'ok',
                        toolOutputPreview: typeof tr.result === 'object' ? tr.result : { value: tr.result },
                        model: modelId,
                    });
                }

                return result;
            } catch (error) {
                span.end({
                    model: modelId,
                    provider: extractProvider(params.model),
                    status: 'error',
                    attributes: { error: (error as Error).message },
                });
                throw error;
            }
        }
        : async () => { throw new Error('generateText not provided to wrapVercelAI'); };

    const wrappedStreamText = fns.streamText
        ? function wrappedStreamText(...args: any[]) {
            const params = args[0] || {};
            const modelId = extractModelId(params.model);
            const span = trace.span('llm', 'streamText');

            const result = fns.streamText!(...args);

            // Wrap the final usage promise if available
            if (result && typeof result.then === 'function') {
                // streamText returns a ReadableStream-like with .usage promise
                const originalUsage = result.usage;
                if (originalUsage && typeof originalUsage.then === 'function') {
                    result.usage = originalUsage.then((usage: any) => {
                        span.end({
                            model: modelId,
                            provider: extractProvider(params.model),
                            inputTokens: usage?.promptTokens,
                            outputTokens: usage?.completionTokens,
                            status: 'ok',
                        });
                        return usage;
                    });
                }
            }

            return result;
        }
        : () => { throw new Error('streamText not provided to wrapVercelAI'); };

    return {
        generateText: wrappedGenerateText,
        streamText: wrappedStreamText,
    };
}

/**
 * Try to extract model ID string from Vercel AI model object.
 */
function extractModelId(model: any): string {
    if (!model) return 'unknown';
    if (typeof model === 'string') return model;
    return model.modelId || model.id || model.model || 'unknown';
}

/**
 * Try to extract provider name from Vercel AI model object.
 */
function extractProvider(model: any): string {
    if (!model) return 'unknown';
    if (typeof model === 'string') return 'unknown';
    return model.provider || model.providerId || 'unknown';
}
