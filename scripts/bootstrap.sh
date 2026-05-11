#!/usr/bin/env bash
set -euo pipefail

echo "=== Nexus Docs Bootstrap ==="

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
RETRIES=30
until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-nexus}" > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "ERROR: PostgreSQL not ready after 30 seconds"
    exit 1
  fi
  sleep 1
done
echo "PostgreSQL is ready."

# Wait for Redis
echo "Waiting for Redis..."
RETRIES=15
until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "ERROR: Redis not ready after 15 seconds"
    exit 1
  fi
  sleep 1
done
echo "Redis is ready."

# Wait for Meilisearch
echo "Waiting for Meilisearch..."
RETRIES=15
until curl -sf http://localhost:7700/health > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "ERROR: Meilisearch not ready after 15 seconds"
    exit 1
  fi
  sleep 1
done
echo "Meilisearch is ready."

# Run migrations
echo "Running database migrations..."
docker compose exec -T app npx prisma migrate deploy
echo "Migrations applied."

# Seed database
echo "Seeding database..."
docker compose exec -T app npx prisma db seed || echo "Seed already applied (or skipped)."
echo "Database seeded."

# Content sync (local dev uses mounted volume, no git needed)
echo "Running content sync..."
docker compose exec -T app npx tsx scripts/reindex.ts
echo "Content indexed."

echo "=== Bootstrap complete ==="
echo "Ready at http://localhost:3333"
