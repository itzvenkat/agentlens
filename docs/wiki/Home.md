# Welcome to AgentLens

**Observability and analytics for AI agents.** See what your agents actually do — every LLM call, tool use, and token spent.

AgentLens is a self-hosted platform that captures telemetry from autonomous AI agents and turns it into actionable insights. Think of it as Datadog, but for AI agents — not servers.

## What it does

- 📊 **Session traces** — See exactly what your agent did, step by step
- 🛑 **Agent Loop Intervention** — First-of-its-kind "Kill Switch" to stall looping agents and manually inject steering hints via the Dashboard.
- 🔁 **Loop detection** — Automatically detect when agents get stuck in repetitive cycles
- 💰 **Cost tracking** — Know how many tokens each session burns
- 🧠 **RL-powered insights** — Q-learning scores each tool based on real outcomes
- 📈 **Retention** — Track how often users return to agentic workflows

## How to integrate

| Method | Best for | Effort |
|--------|----------|--------|
| [[LLM Proxy]] | Desktop apps, IDEs (Claude, Cursor, ChatGPT) | Change 1 URL |
| [[SDK Guide]] | Custom agents, TypeScript/Node.js apps | 2 lines of code |
| [[MCP Server]] | MCP-compatible tools (Claude Desktop, Copilot) | Edit 1 config file |
| [[REST API]] | Any language, direct HTTP | POST request |

## Get started

→ [[Quick Start]] — up and running in 5 minutes

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  docker compose up                                            │
│                                                                │
│  ┌─────────┐  ┌─────────┐  ┌───────────┐  ┌──────────────┐   │
│  │ Postgres │  │  Redis  │  │    API    │  │  Dashboard   │   │
│  │  :5432   │  │  :6379  │  │   :9471   │  │    :9472     │   │
│  └─────────┘  └─────────┘  └─────┬─────┘  └──────────────┘   │
│                                   │                            │
│                            ┌──────┴──────┐                     │
│                            │  LLM Proxy  │                     │
│                            │    :9473    │                     │
│                            └─────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

| Service | Port | Purpose |
|---------|------|---------|
| API | 9471 | REST API — receives telemetry, serves analytics |
| Dashboard | 9472 | Next.js analytics UI |
| LLM Proxy | 9473 | Transparent proxy — auto-logs LLM calls |
| PostgreSQL | 5432 | Data storage |
| Redis | 6379 | Job queues (BullMQ) |
