/**
 * Generic fetch wrapper — auto-detects LLM API calls and records them as spans.
 * Zero-config observability for any provider.
 */

import { AgentLensClient } from '../client';

/** Known LLM API endpoint patterns */
const LLM_ENDPOINTS: Array<{
    pattern: RegExp;
    provider: string;
    extract: (url: string, body: any, response: any) => {
        model?: string;
        inputTokens?: number;
        outputTokens?: number;
        name: string;
    };
}> = [
        {
            pattern: /api\.openai\.com\/v1\/chat\/completions/,
            provider: 'openai',
            extract: (_url, body, res) => ({
                model: body?.model || res?.model,
                inputTokens: res?.usage?.prompt_tokens,
                outputTokens: res?.usage?.completion_tokens,
                name: 'chat.completions',
            }),
        },
        {
            pattern: /api\.anthropic\.com\/v1\/messages/,
            provider: 'anthropic',
            extract: (_url, body, res) => ({
                model: body?.model || res?.model,
                inputTokens: res?.usage?.input_tokens,
                outputTokens: res?.usage?.output_tokens,
                name: 'messages.create',
            }),
        },
        {
            pattern: /generativelanguage\.googleapis\.com/,
            provider: 'google',
            extract: (_url, body, res) => ({
                model: body?.model,
                inputTokens: res?.usageMetadata?.promptTokenCount,
                outputTokens: res?.usageMetadata?.candidatesTokenCount,
                name: 'generateContent',
            }),
        },
        {
            pattern: /openrouter\.ai\/api\/v1/,
            provider: 'openrouter',
            extract: (_url, body, res) => ({
                model: body?.model || res?.model,
                inputTokens: res?.usage?.prompt_tokens,
                outputTokens: res?.usage?.completion_tokens,
                name: 'chat.completions',
            }),
        },
        {
            pattern: /localhost:11434\/api\/(generate|chat)/,
            provider: 'ollama',
            extract: (_url, body, res) => ({
                model: body?.model || res?.model,
                inputTokens: res?.prompt_eval_count,
                outputTokens: res?.eval_count,
                name: 'generate',
            }),
        },
    ];

/**
 * Wrap the global fetch function to auto-detect LLM API calls and record
 * them as spans. Works with any provider without specific SDK integration.
 *
 * Usage:
 *   import { AgentLensClient } from '@itzvenkat0/agentlens-sdk';
 *   import { wrapFetch } from '@itzvenkat0/agentlens-sdk/wrappers/fetch';
 *
 *   const lens = new AgentLensClient({ apiKey: 'al_...' });
 *   globalThis.fetch = wrapFetch(lens, globalThis.fetch);
 *   // All subsequent fetch() calls to known LLM APIs are auto-traced
 */
export function wrapFetch(
    client: AgentLensClient,
    originalFetch: typeof fetch,
    traceId?: string,
): typeof fetch {
    const trace = client.trace(traceId);

    return async function instrumentedFetch(
        input: RequestInfo | URL,
        init?: RequestInit,
    ): Promise<Response> {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        // Check if this is a known LLM endpoint
        const endpoint = LLM_ENDPOINTS.find((e) => e.pattern.test(url));
        if (!endpoint) {
            return originalFetch(input, init);
        }

        const span = trace.span('llm', endpoint.extract(url, null, null).name);
        let requestBody: any;

        // Try to parse request body
        try {
            if (init?.body && typeof init.body === 'string') {
                requestBody = JSON.parse(init.body);
            }
        } catch {
            // Not JSON, that's fine
        }

        try {
            const response = await originalFetch(input, init);

            // Clone response so we can read body without consuming it
            const cloned = response.clone();
            let responseBody: any;
            try {
                responseBody = await cloned.json();
            } catch {
                // Response isn't JSON (might be streaming)
            }

            const extracted = endpoint.extract(url, requestBody, responseBody);

            span.end({
                model: extracted.model,
                provider: endpoint.provider,
                inputTokens: extracted.inputTokens,
                outputTokens: extracted.outputTokens,
                status: response.ok ? 'ok' : 'error',
                attributes: response.ok ? undefined : { httpStatus: response.status },
            });

            return response;
        } catch (error) {
            span.end({
                provider: endpoint.provider,
                model: requestBody?.model,
                status: 'error',
                attributes: { error: (error as Error).message },
            });
            throw error;
        }
    };
}
