---
title: "Content Model"
summary: "How frontmatter, tiers, and extension permissions interact."
access_tier: public
product: platform
status: published
owner: maintainer
tags: [content, access-control]
nav_order: 2
---

# Content Model

Every page in Nexus Docs is a Markdown or MDX file under `content/`. Frontmatter declares both its metadata and its access rules.

## Required fields

| Field | Purpose |
|---|---|
| `title` | Browser tab, h1, og:title |
| `summary` | Meta description, search hits — keep under 160 chars |
| `access_tier` | One of: `public`, `client`, `partner`, `admin` |
| `product` | What this doc is about (e.g., `platform`, `example/extension-foo`) |
| `status` | `draft` (hidden), `published`, `deprecated` (visible with banner) |
| `owner` | Username — used for ownership emails and audit |

## Optional fields

| Field | Purpose |
|---|---|
| `extensions` | Array of extension slugs that grant access |
| `tags` | For tag landing pages and search facets |
| `video` | YouTube/Vimeo URL — auto-rendered at top of the page |
| `last_verified_at` | Date — feeds stale-content reminders |
| `review_interval_days` | Threshold for stale reminders (default 90) |
| `nav_order` | Sort order inside its section |
| `nav_hidden` | If `true`, page is reachable by URL but not in nav |
| `redirect_from` | Array of old paths to 301-redirect to this page |

## Access semantics

Tiers have ranks: `public = 0`, `client = 10`, `partner = 20`, `admin = 100`. Higher rank inherits lower.

### Public pages

`access_tier: public` — visible to everyone, including anonymous visitors. No login required.

### Client pages

`access_tier: client` — visible to users with tier rank ≥ 10, **AND** matching extension/product permission:

- If `extensions: [a, b]` is set, the user must own `a` or `b`
- Else if `product: example/foo` is set (and not `platform`), user must own `example/foo`
- Else (no extensions, `product: platform`), any client user can see it

### Partner / admin pages

`access_tier: partner` or `admin` — visible to users with sufficient rank. **Extension checks are bypassed** at partner-rank and above.

## Embedded components

MDX gives you React components inside markdown:

<Admonition type="info" title="Admonition">
Use `<Admonition type="info|warning|tip|danger" title="...">` for callouts.
</Admonition>

```mdx
<Admonition type="warning" title="Watch out">
This is a warning admonition.
</Admonition>
```

Other available components:

- `<VideoEmbed src="https://youtube.com/watch?v=..." title="..." />`
- `<CodeTabs>` — multi-language code samples
- `<Collapsible title="...">` — expandable section
- `<Protected tier="partner" label="Partner">` — inline gated block
- `<ExtensionGrid path="..." columns={4} />` — auto-grid of child docs
