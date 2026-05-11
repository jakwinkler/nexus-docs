---
title: "Example: Partner-Only Content"
summary: "Internal page visible only to partner-tier users and above. Used as a working example of higher-tier gating."
access_tier: partner
product: platform
status: published
owner: maintainer
tags: [example, access-control]
nav_order: 4
nav_hidden: false
---

# Partner-Only Content

This page is `access_tier: partner` — visible to partner, gold_partner, platinum_partner, and admin users. **Client and anonymous users see a locked stub instead.**

## When to use

- Internal roadmaps you want to share with strategic partners but not customers
- Pricing tier details that you don't want indexed publicly
- Implementation guides for integration partners

## Try it

Sign in as `partner@example.com` / `password123` (the seeded partner user) and reload — you'll see this content. Sign out and you'll see the locked state.

<Admonition type="info" title="Tier inheritance">
Higher tiers automatically inherit access to lower-tier content. Anyone at <code>partner</code> rank or above (20+) can read this page. Extension checks are skipped at partner-rank and above.
</Admonition>
