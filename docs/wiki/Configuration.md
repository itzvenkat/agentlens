# Configuration

All configuration is managed through environment variables. Copy `.env.example` to get started:

```bash
cp .env.example .env.development
```

## All Variables

### API Server

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment (`development`, `production`) |
| `APP_PORT` | `9471` | API server port |
| `APP_NAME` | `agentlens` | Application name |
| `APP_VERSION` | `0.1.0` | Application version |
| `APP_LOG_LEVEL` | `debug` | Log level (`debug`, `info`, `warn`, `error`) |
| `APP_CORS_ORIGINS` | `http://localhost:9472` | Comma-separated allowed CORS origins |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `postgres` | PostgreSQL host (use `postgres` for Docker, `localhost` for local) |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `agentlens` | Database username |
| `DB_PASSWORD` | — | Database password |
| `DB_DATABASE` | `agentlens_dev` | Database name |
| `DB_SYNCHRONIZE` | `true` | Auto-sync schema (set `false` in production) |
| `DB_LOGGING` | `true` | Log SQL queries |
| `DB_SSL` | `false` | Enable SSL for database connection |

### Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `redis` | Redis host (use `redis` for Docker, `localhost` for local) |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Redis password |
| `REDIS_DB` | `0` | Redis database number |

### Auth

| Variable | Default | Description |
|----------|---------|-------------|
| `MASTER_API_KEY` | — | Master key for creating projects. Keep this secret. |

### Processor

| Variable | Default | Description |
|----------|---------|-------------|
| `LOOP_DETECTION_THRESHOLD` | `3` | Number of duplicate consecutive tool calls before flagging a loop |

### LLM Proxy

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENTLENS_API_KEY` | — | API key for a project (create one first via the API) |
| `PROXY_PORT` | `9473` | Port the proxy server listens on |
| `UPSTREAM_BASE_URL` | `https://api.openai.com` | Default upstream LLM API to forward to |

### Dashboard

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHBOARD_PORT` | `9472` | Dashboard port |

## Production tips

1. **Set `DB_SYNCHRONIZE=false`** — Use TypeORM migrations instead of auto-sync
2. **Set strong passwords** — Change `DB_PASSWORD` and `MASTER_API_KEY`
3. **Restrict CORS** — Set `APP_CORS_ORIGINS` to your actual domain
4. **Set `APP_LOG_LEVEL=info`** — Reduce noise in production logs
5. **Set `DB_LOGGING=false`** — Don't log SQL queries in production
