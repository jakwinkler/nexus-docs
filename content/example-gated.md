---
title: "Example: Gated Content"
summary: "A page that requires client-tier access. Sign in as the seeded client user to see the contents."
access_tier: client
product: platform
status: published
owner: maintainer
tags: [example, access-control]
nav_order: 3
---

# Example: Gated Content

This page is `access_tier: client` with `product: platform`, meaning **any logged-in user at client tier or above can read it**.

Anonymous visitors see a "request access" prompt instead of the body.

## When to use this pattern

- High-level product overview that benefits from being public but you want to require a free signup
- Technical details that aren't sensitive but you'd like a marketing capture point
- Roadmaps you want stakeholders to see but not search engines

For real per-product gating, set `product: example/your-extension` and grant that permission via **Admin → Users**.

<Admonition type="tip" title="Try it">
Sign out and reload this page — you'll see the locked state. Sign back in as `client@example.com` / `password123` (seeded) and you'll see the body.
</Admonition>
