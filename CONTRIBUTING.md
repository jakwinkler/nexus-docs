# Contributing to Nexus Docs

Thanks for your interest! A few quick notes to keep PRs flowing smoothly.

## Development setup

```bash
git clone https://github.com/jakwinkler/nexus-docs.git
cd nexus-docs
cp .env.example .env
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

App runs at http://localhost:3333. Hot reload is on by default (the `app` service uses the `development` build target).

## Running tests

```bash
npm test            # vitest, 225+ tests
npm run lint        # next lint
npx tsx scripts/validate-content.ts   # frontmatter & link validation
```

CI runs all three on PRs. Build must pass too (`npx next build`).

## Filing issues

- **Bug:** include reproduction steps, expected vs actual, browser/Node version
- **Feature:** explain the use case first, propose the API/UX second
- **Security:** **DO NOT** open a public issue — see [SECURITY.md](SECURITY.md)

## PR conventions

- One logical change per PR. Big refactors split into reviewable chunks.
- Conventional commit prefix preferred: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Update tests when changing behaviour
- If you change a Prisma schema, include the migration

## Areas that need help

- Translating the UI (no i18n infrastructure yet — would be a great first feature contribution)
- Plugin system for custom MDX components
- Documentation: better screenshots, demo content, a hosted demo
- Migrating tier names from hardcoded enum to DB-driven (`KNOWN_TIER_NAMES` in `src/lib/acl/index.ts`)

## Code style

- TypeScript strict mode is on; please keep it green
- Prefer server components when fetching data; mark client components with `"use client"` only when necessary
- ACL is the single source of truth for access decisions — never bypass it in routes or pages
- Email content goes through `htmlToText()` automatically; don't hand-roll plain-text alternatives

## Releasing (maintainers)

1. Update `CHANGELOG.md`
2. Bump version in `package.json`
3. Tag: `git tag -a v0.X.Y -m "Release v0.X.Y"`
4. Push: `git push origin master --tags`
5. GitHub Release with the changelog entry
