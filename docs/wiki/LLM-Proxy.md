# LLM Proxy

The LLM Proxy is a transparent HTTP server that sits between your LLM client and the provider API. It forwards all requests unchanged and silently logs telemetry to AgentLens.

**Best for:** Desktop apps, IDEs, and any client where you can't modify code.

## How it works

```
Your Client → localhost:4000 → Proxy logs the call → Forwards to real API → Returns response
```

The proxy:
- Forwards all requests to the upstream LLM API **unchanged**
- Reads the response to extract token usage, model, tool calls
- Logs everything to AgentLens as spans
- Supports both streaming and non-streaming responses
- Adds **zero latency** to the actual API call (logging is async)

## Setup

### 1. Set your API key

Edit `.env.development` and add the API key from your project:

```env
AGENTLENS_API_KEY=al_your_key_here
```

### 2. Start the proxy

```bash
# With Docker (recommended)
docker compose up -d proxy

# Or standalone
AGENTLENS_API_KEY=al_your_key npm run start:proxy
```

### 3. Point your client to the proxy

| Client | Setting | Value |
|--------|---------|-------|
| **Cursor** | Settings → Models → OpenAI Base URL | `http://localhost:4000/v1` |
| **Continue.dev** | `~/.continue/config.json` → `apiBase` | `http://localhost:4000/v1` |
| **Any OpenAI SDK** | Environment variable | `OPENAI_BASE_URL=http://localhost:4000/v1` |
| **Anthropic SDK** | Environment variable | `ANTHROPIC_BASE_URL=http://localhost:4000` |
| **Python OpenAI** | `openai.base_url` | `http://localhost:4000/v1` |

## Supported Providers

The proxy auto-detects the provider based on request headers:

| Provider | Detection method | Token extraction |
|----------|-----------------|-----------------|
| **OpenAI** | Default (Bearer token auth) | `usage.prompt_tokens`, `usage.completion_tokens` |
| **Anthropic** | `x-api-key` + `anthropic-version` headers | `usage.input_tokens`, `usage.output_tokens` |
| **Google AI** | URL contains `generativelanguage.googleapis.com` | `usageMetadata.promptTokenCount` |
| **OpenRouter** | URL contains `openrouter.ai` | `usage.prompt_tokens`, `usage.completion_tokens` |
| **Ollama** | URL contains `localhost:11434` | `prompt_eval_count`, `eval_count` |

### Explicit provider override

Add the `X-AgentLens-Provider` header to force a specific provider:

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "X-AgentLens-Provider: anthropic" \
  -H "x-api-key: sk-ant-..." \
  ...
```

## Changing the upstream API

By default, the proxy forwards to `https://api.openai.com`. Change it with:

```env
# In .env.development
UPSTREAM_BASE_URL=https://api.anthropic.com
```

Or per-instance:

```bash
UPSTREAM_BASE_URL=https://api.anthropic.com docker compose up -d proxy
```

## Tool call detection

The proxy automatically detects tool calls in responses:

- **OpenAI**: `choices[].message.tool_calls[]` → recorded as tool spans
- **Anthropic**: `content[]` blocks with `type: "tool_use"` → recorded as tool spans

Each detected tool call creates a child span linked to the parent LLM span.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROXY_PORT` | `4000` | Port the proxy listens on |
| `AGENTLENS_API_URL` | `http://localhost:3000` | AgentLens API endpoint |
| `AGENTLENS_API_KEY` | — | Your project's API key |
| `UPSTREAM_BASE_URL` | `https://api.openai.com` | Default upstream LLM API |
