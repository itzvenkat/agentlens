import AgentLens from '@itzvenkat0/agentlens-sdk';

// 1. Configure the AgentLens client
const client = new AgentLens({
    apiKey: 'agentlens_master_dev_key',
    endpoint: 'http://localhost:9471',
    flushIntervalMs: 1000 // Very fast flush for testing
});

const traceId = `kill-switch-test-${Date.now()}`;
let spanCounter = 0;

async function mockAgentLoop() {
    console.log(`Starting mock looping agent with trace: ${traceId}`);

    // Simulate generating an initial text response
    await emitLlmSpan();

    // Simulate a tool getting stuck in a loop trying to read a file
    for (let i = 0; i < 5; i++) {
        console.log(`\n--- Iteration ${i + 1} ---`);

        // 1. Emit the intention to use a tool
        await emitToolSpan('read_file', { path: '/tmp/missing.txt' }, 'error: file not found');

        // 2. Mock network delay while the agent "thinks"
        await new Promise(r => setTimeout(r, 1000));

        // 3. Emit the LLM network request (This is where the Proxy would normally block it)
        // Wait, for our Proxy test we actually need to hit the proxy! 
        // This script just generates telemetry directly to the API, which tests the LoopDetector
        // but DOES NOT test the Proxy interceptor.

        // To test the proxy, we have to actually do a fetch to the proxy!
        await triggerProxyRequest(i);

        await new Promise(r => setTimeout(r, 1500));
    }

    console.log("Mock agent finished");
}

async function emitLlmSpan() {
    client.record({
        traceId,
        spanId: `span-llm-${++spanCounter}`,
        type: 'llm',
        name: 'claude-3.5-sonnet.initial',
        model: 'claude-3.5-sonnet',
        provider: 'anthropic',
        inputTokens: 100,
        outputTokens: 50,
        status: 'ok'
    });
}

async function emitToolSpan(name: string, input: any, output: any) {
    client.record({
        traceId,
        spanId: `span-tool-${++spanCounter}`,
        type: 'tool',
        name,
        toolName: name,
        toolInputPreview: input,
        toolOutputStatus: 'error',
        toolOutputPreview: output
    });
}

async function triggerProxyRequest(iteration: number) {
    try {
        console.log(`[Agent] Sending LLM request through Proxy...`);
        const res = await fetch('http://localhost:9473/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-AgentLens-Trace-Id': traceId,
                // Tell proxy we are mocking openai
                'X-AgentLens-Provider': 'openai'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: `Iteration ${iteration}` }]
            })
        });

        // Since we are posting an invalid openai request (no auth), it will 401
        // but the proxy should still pause it if intervention is pending!
        const status = res.status;
        console.log(`[Agent] Proxy returned status: ${status}`);
    } catch (e) {
        console.error(`[Agent] Proxy request failed:`, e);
    }
}

mockAgentLoop().then(() => {
    // Wait for final telemetry flush
    setTimeout(() => {
        client.flush().then(() => {
            console.log("Telemetry flushed. Exiting.");
            process.exit(0);
        });
    }, 2000);
});
