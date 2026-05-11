.PHONY: up down dev migrate seed reindex sync logs test lint shell clean

# Full bootstrap (first time) or start (subsequent)
up:
	@echo "Starting services..."
	docker compose up -d
	@echo "Running bootstrap..."
	bash scripts/bootstrap.sh
	@echo "Ready at http://localhost:3000"

# Stop all services
down:
	docker compose down

# Start in dev mode with logs
dev:
	docker compose up

# Run pending DB migrations
migrate:
	docker compose exec app npx prisma migrate deploy

# Seed database
seed:
	docker compose exec app npx prisma db seed

# Rebuild Meilisearch index
reindex:
	docker compose exec worker npx tsx scripts/reindex.ts

# Force content sync from GitLab
sync:
	docker compose exec worker bash scripts/content-sync.sh

# Tail all service logs
logs:
	docker compose logs -f

# Run test suite
test:
	docker compose exec app npm test

# Lint markdown + code
lint:
	docker compose exec app npm run lint

# Shell into app container
shell:
	docker compose exec app sh

# Remove all volumes (destructive)
clean:
	@echo "This will delete all data. Press Ctrl+C to cancel."
	@sleep 3
	docker compose down -v
