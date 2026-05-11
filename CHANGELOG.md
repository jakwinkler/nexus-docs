# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) — Nexus Docs uses
[SemVer](https://semver.org/) once we hit `1.0.0`. Until then expect breaking changes
in any release.

## [Unreleased]

## [0.1.0] — 2026-05-11

Initial public release.

### Features
- Markdown / MDX content with tiered access (`public` / `client` / `partner` / `admin`)
- Extension-level permissions for per-product gating
- Auth.js v5 sessions: credentials + GitLab OAuth
- Invitation system: admin sends, recipient sets up account
- Access request workflow with admin email notifications
- Ideas board: public submission, admin review, status-change emails
- Feedback widget (thumbs + comment) with negative-feedback alerts
- MeiliSearch full-text search, ACL-filtered
- Tag landing pages
- YouTube + Vimeo embeds with sandbox + no-cookie domain
- SEO: sitemap, robots, OpenGraph, Twitter, JSON-LD (TechArticle, Breadcrumb, FAQ)
- Transactional email with anti-spam headers and plain-text alternative
- Production-ready Docker Compose setup, Prisma migrations, seed script

### Security
- Rate limiting (Redis-backed) on auth, feedback, access-request, invitation, password-change, idea-submit endpoints
- ACL fail-closed on unknown tier names
- Search filter mirrors ACL semantics (no client-doc leak via `_formatted`)
- bcrypt cost 12 for password hashing
- CSRF via Auth.js
- SHA-256 timing-safe digest for GitLab webhook validation
- TOCTOU-safe atomic invitation claim
- `UserPermission.expiresAt` enforced everywhere
- Strict DMARC alignment supported (DKIM signs with the From domain)
