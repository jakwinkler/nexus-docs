---
title: "Getting Started"
summary: "How to clone, configure, and run Nexus Docs locally."
access_tier: public
product: platform
status: published
owner: maintainer
tags: [setup, install]
nav_order: 1
---

# Getting Started

## Prerequisites

- Docker 24+ and Docker Compose
- ~2 GB RAM
- Optional: a domain + DNS access if you want HTTPS via Let's Encrypt

## 1. Clone and configure

```bash
git clone https://github.com/jakwinkler/nexus-docs.git
cd nexus-docs
cp .env.example .env
```

Edit `.env` and set at minimum:

- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `MEILISEARCH_KEY` — generate with `openssl rand -base64 32` (production refuses to start without it)
- `NEXTAUTH_URL` — the URL users will hit, e.g. `https://docs.example.com`

## 2. First boot

```bash
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

App is now at http://localhost:3333.

## 3. Sign in and change the default password

Default credentials: `admin@example.com` / `password123`.

Go to **Dashboard → Account** and change the password immediately.

## 4. Add content

Drop Markdown files into `content/`. Each file becomes a page. Frontmatter controls access:

```yaml
---
title: "My first page"
summary: "Short description for SEO."
access_tier: public
product: platform
status: published
owner: maintainer
tags: [example]
---

# Hello world

Standard markdown here.
```

After adding content, reindex:

```bash
docker compose exec worker npx tsx scripts/reindex.ts
```

## 5. Going to production

See the [deployment guide](/docs/deployment) for SSL, SMTP, GitLab OAuth, and ongoing maintenance.
