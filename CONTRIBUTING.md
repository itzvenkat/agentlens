# Contributing to AgentLens

Thanks for considering contributing! Here's how to get started.

## Development setup

```bash
git clone https://github.com/itzvenkat/agentlens.git
cd agentlens

# Install dependencies
npm install --legacy-peer-deps
cd dashboard && npm install && cd ..

# Start infrastructure
docker compose up -d postgres redis

# Start API (with hot reload)
npm run start:api:dev

# Start dashboard (separate terminal)
cd dashboard && npm run dev
```

## Project structure

- `apps/api/` — NestJS backend API
- `apps/mcp-server/` — MCP server for agent self-instrumentation
- `libs/common/` — Shared entities, DTOs, constants
- `libs/sdk/` — TypeScript SDK (published to npm)
- `dashboard/` — Next.js analytics dashboard
- `docker/` — Dockerfiles and database init scripts

## Making changes

1. **Fork** the repo and create a branch from `main`
2. **Write code** — follow the existing patterns and style
3. **Test** — run `npm test` and `npm run build:api` before submitting
4. **Commit** — use clear commit messages (`fix: ...`, `feat: ...`, `docs: ...`)
5. **Open a PR** against `main`

## Code style

- TypeScript strict mode
- Prettier for formatting (`npm run format`)
- ESLint for linting (`npm run lint`)

## Reporting bugs

Open an issue with:
- What you expected
- What happened instead
- Steps to reproduce
- Environment (Node version, OS)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
