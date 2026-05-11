# Nexus Docs

> A modern documentation portal with tier-based access control, extension-level gating, and a real admin panel — built with Next.js, Prisma, MeiliSearch, and BullMQ.

Think of it as a self-hostable mix of **MkDocs / Docusaurus** *(public docs)* and **GitBook for Business** *(gated private docs with per-customer access)*. You write Markdown / MDX, declare access tiers in frontmatter, and Nexus Docs handles authentication, ACL, search filtering, invitations, and feedback collection.

---

## Why does this exist?

Most docs generators are either fully public (MkDocs, Docusaurus) or gated behind a SaaS paywall (Notion, GitBook). Nexus Docs sits in the middle:

- **Public marketing pages, gated detail pages** — perfect for product docs where install & overview are public but configuration is licensed
- **Per-user extension permissions** — a customer who licensed `extension-a` can see its config docs, but not `extension-b`
- **Self-hostable** — your data stays on your servers, including the search index
- **Real admin UX** — invite users by email, review access requests, browse audit logs, track feedback and ideas

---

## Features

- 📚 **Markdown / MDX content** — write docs as files, deploy via git
- 🔒 **Tiered ACL** — `public`, `client`, `partner`, `admin` tiers with rank-based access. Configurable.
- 🧩 **Extension-level permissions** — gate individual products / modules per user
- 🔎 **MeiliSearch full-text search** — ACL-aware filtering so users only see hits they're allowed to read
- 🔐 **Auth** — email/password (with bcrypt + rate limiting) + GitLab / OAuth via Auth.js v5
- ✉️ **Invitations** — admin sends signed-token invite emails, recipient sets up their account
- 🎫 **Access requests** — locked pages have a "request access" CTA that emails admins
- 💡 **Ideas board** — public submission form, admin review with status workflow, email notifications
- 📝 **Feedback widget** — thumbs up/down on every page, admin notifications on negative comments
- 🏷️ **Tag landing pages** — auto-generated browse-by-topic with full ACL filtering
- 📺 **Video embeds** — YouTube/Vimeo with sandbox + no-cookie domain
- 🗺️ **SEO** — sitemap, robots, OpenGraph, Twitter cards, JSON-LD (TechArticle, BreadcrumbList, FAQ, SoftwareApplication)
- 🔄 **Live content reload** — git push → webhook → reindex (no rebuild needed)
- 📧 **Email** — Resend or SMTP, with transactional headers, plain-text alt, DKIM-friendly defaults
- 🚀 **Production-ready** — Docker Compose, Prisma migrations, graceful seeding, health checks

---

## Quick start

**Prerequisites:** Docker, Docker Compose, ~2GB RAM.

```bash
git clone https://github.com/jakwinkler/nexus-docs.git
cd nexus-docs
cp .env.example .env
# (edit .env — at minimum set AUTH_SECRET, NEXTAUTH_URL, MEILISEARCH_KEY)

docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

Open http://localhost:3333. Default admin: `admin@example.com` / `password123` *(change immediately at `/dashboard/account`)*.

---

## Architecture

```
┌──────────────┐    ┌──────────────┐
│  Next.js     │◀───│   nginx /    │
│  (app)       │    │  reverse     │
│              │    │  proxy       │
└──────┬───────┘    └──────────────┘
       │
       ├─→ Postgres (Prisma)
       ├─→ Redis     (BullMQ queues)
       ├─→ MeiliSearch (search)
       │
       └─→ ┌──────────────┐
           │  Worker      │   content sync, reindex,
           │  (BullMQ)    │   email delivery, webhooks
           └──────────────┘
```

- **Next.js App Router**, server components for ACL-checked rendering
- **Auth.js v5** for sessions (JWT strategy)
- **Prisma ORM** for Postgres
- **MeiliSearch** index per doc, filterable by `access_tier`, `product`, `extensions`
- **BullMQ workers** for async jobs (content sync from git, reindex, email send)

---

## Content model

Each `.md` / `.mdx` file under `content/` becomes a page. Frontmatter controls access and metadata:

```yaml
---
title: "Configuring Extension Foo"
summary: "Set up authentication and access rules."
access_tier: client            # public | client | partner | admin
product: example/extension-foo  # which product this doc belongs to
extensions: []                 # optional: extra extension grants
status: published              # draft | published | deprecated
tags: [setup, security]
owner: someone
last_verified_at: 2026-01-15   # for stale-content alerts
review_interval_days: 90
---

# Configuring Extension Foo

Standard markdown + MDX components:

<Admonition type="info" title="Note">
You can use custom React components inside docs.
</Admonition>

<Protected tier="partner" label="Partner">
This block is only visible to partner-tier users and above.
</Protected>
```

Access semantics: `public` is visible to all; `client` requires the matching `product` or `extensions` permission; `partner+` bypasses extension checks.

---

## Configuration

All settings via environment variables. See `.env.example` for the full list. Key ones:

| Variable | Description |
|---|---|
| `AUTH_SECRET` | JWT signing secret (generate with `openssl rand -base64 32`) |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis URL for BullMQ |
| `MEILISEARCH_URL` / `MEILISEARCH_KEY` | Search index |
| `EMAIL_FROM` | From-address for outgoing mail |
| `SMTP_HOST` / `SMTP_PORT` / `RESEND_API_KEY` | Mail transport |
| `GITLAB_CLIENT_ID` / `GITLAB_CLIENT_SECRET` | Optional GitLab OAuth |
| `GITLAB_DEFAULT_TIER` | Auto-tier for new GitLab signups (e.g. `partner`) |

---

## Roadmap

- [ ] Plugin system for custom MDX components
- [ ] Multi-language support (i18n)
- [ ] Email queue for retries (currently fire-and-forget)
- [ ] Tier names fully DB-driven (currently hardcoded enum)
- [ ] Webhook-based content sync from any git host (currently GitLab-first)
- [ ] Image optimization via Next.js `<Image>` in MDX

---

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Security disclosures: see [SECURITY.md](SECURITY.md).

---

## License

MIT — see [LICENSE](LICENSE).
