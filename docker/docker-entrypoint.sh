#!/bin/sh
set -e

echo "╔══════════════════════════════════════════╗"
echo "║   AgentLens API — Container Startup      ║"
echo "╚══════════════════════════════════════════╝"

# ── Run database migrations ──
echo "▶ Running database migrations..."
node node_modules/.bin/typeorm migration:run -d dist/apps/api/apps/api/src/config/data-source.js
echo "✓ Migrations complete."

# ── Start the NestJS application ──
echo "▶ Starting NestJS server..."
exec node dist/apps/api/apps/api/src/main.js
