# Deployment

## Docker Compose (recommended)

The simplest way to deploy AgentLens. All 5 services run with one command.

### Development

```bash
cp .env.example .env.development
docker compose up -d
```

### Production

```bash
# Create production config
cp .env.example .env.production

# Edit with real credentials
nano .env.production
```

Key production changes:
- Set strong `DB_PASSWORD` and `MASTER_API_KEY`
- Set `DB_SYNCHRONIZE=false`
- Set `APP_LOG_LEVEL=info`
- Set `APP_CORS_ORIGINS` to your actual domain
- Set `AGENTLENS_API_KEY` after creating your first project

```bash
NODE_ENV=production docker compose up -d --build
```

### Verify deployment

```bash
# Check all services
docker compose ps

# Check API
curl http://localhost:9471/health

# Check proxy
curl http://localhost:9473/health

# Check dashboard
curl -s http://localhost:9472 | head -1

# View logs
docker compose logs -f
```

## Local Development (without full Docker)

Run only the infrastructure in Docker, and the apps natively for hot reload:

```bash
# Install dependencies
npm install --legacy-peer-deps
cd dashboard && npm install && cd ..

# Start only Postgres + Redis
docker compose up -d postgres redis

# Terminal 1: API with hot reload
npm run start:api:dev

# Terminal 2: Dashboard with hot reload
cd dashboard && npm run dev

# Terminal 3: Proxy
npm run start:proxy
```

## Cloud Deployment

### Any VPS (DigitalOcean, Hetzner, etc.)

1. SSH into your server
2. Install Docker and Docker Compose
3. Clone the repo
4. Configure `.env.production`
5. Run `docker compose up -d --build`
6. Set up a reverse proxy (nginx/Caddy) for HTTPS

Example nginx config:

```nginx
server {
    listen 443 ssl;
    server_name agentlens.yourdomain.com;

    location / {
        proxy_pass http://localhost:9472;
    }

    location /v1/ {
        proxy_pass http://localhost:9471;
    }

    location /proxy/ {
        proxy_pass http://localhost:9473/;
    }
}
```

### Firebase / Serverless

The API and dashboard can be adapted for serverless, but you'll need:
- A managed PostgreSQL instance (e.g., Supabase, Neon)
- A managed Redis instance (e.g., Upstash)
- Update `DB_HOST` and `REDIS_HOST` in your env config

## Useful commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start all services |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop + delete data volumes |
| `docker compose logs -f` | Follow all logs |
| `docker compose logs -f api` | Follow API logs only |
| `docker compose ps` | Check service status |
| `docker compose up -d --build` | Rebuild and restart |
