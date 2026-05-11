#!/usr/bin/env bash
set -euo pipefail

echo "=== Nexus Docs Production Deploy ==="

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# We only need APP_PORT for the health-check URL — docker compose loads
# .env on its own. Read APP_PORT specifically rather than sourcing the
# whole file (some values legitimately contain quotes / colons / spaces).
if [ -z "${APP_PORT:-}" ] && [ -f .env ]; then
  APP_PORT=$(grep -E '^APP_PORT=' .env | tail -1 | cut -d= -f2- | tr -d '"' || true)
fi
APP_PORT="${APP_PORT:-3333}"

# Pull latest
echo "Pulling latest changes..."
git fetch origin master
git reset --hard origin/master

# Build
echo "Building production images..."
$COMPOSE build

# Start
echo "Starting services..."
$COMPOSE up -d

# Wait for app health (poll up to 60s)
echo "Waiting for app to respond on :${APP_PORT}..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${APP_PORT}" > /dev/null; then
    echo "App is responding."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: app did not respond on :${APP_PORT} within 60s"
    $COMPOSE logs --tail=100 app
    exit 1
  fi
  sleep 2
done

# Migrate — fatal on failure
echo "Running migrations..."
$COMPOSE exec -T app npx prisma migrate deploy

# Seed (only creates if not exists) — fatal on failure
echo "Seeding database..."
$COMPOSE exec -T app npx prisma db seed

# Reindex — runs in the worker container because it executes TS via tsx,
# which needs src/ + tsconfig.json (only present on the dev image target).
# Non-fatal: search will work with stale data and can be re-run manually.
echo "Reindexing search..."
if ! $COMPOSE exec -T worker npx tsx scripts/reindex.ts; then
  echo "WARNING: reindex failed — search may show stale results. Re-run with: docker compose ... exec worker npx tsx scripts/reindex.ts"
fi

# Final verification
echo "Final state:"
$COMPOSE ps
curl -sf "http://localhost:${APP_PORT}" > /dev/null && echo "App is healthy!" || { echo "ERROR: app stopped responding after deploy"; exit 1; }

echo "=== Deploy complete ==="
