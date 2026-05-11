# Security Policy

## Supported versions

Nexus Docs is pre-1.0. Only the `master` branch receives security fixes. Track [releases](https://github.com/jakwinkler/nexus-docs/releases) for backportable patches.

## Reporting a vulnerability

**Please do not open public issues for security problems.**

Email: **security@example.com** *(replace with your security contact)*

Include:
- A description of the issue and its impact
- Steps to reproduce (or a proof-of-concept)
- Affected version / commit SHA
- Optional: a suggested fix

You should expect:
- Acknowledgement within **72 hours**
- A status update within **7 days**
- A coordinated disclosure timeline once we agree on a fix

We follow a 90-day disclosure window unless the issue is actively exploited.

## Scope

In-scope:
- The Nexus Docs application code (this repository)
- The default Docker Compose configuration shipped here

Out-of-scope:
- Vulnerabilities in third-party dependencies — please report those upstream (we'll bump versions promptly when fixes land)
- Issues that require physical access or a compromised admin account
- Denial of service via excessive resource consumption (rate-limit configuration is the operator's responsibility)

## Hardening notes for operators

The defaults are reasonable but **you must**:
- Rotate `AUTH_SECRET` after first deploy
- Change the seeded admin password immediately (`/dashboard/account`) — `password123` is in the seed script
- Configure SPF, DKIM, and DMARC on your sending domain if using SMTP
- Enable `MEILISEARCH_KEY` in production (the app refuses to start without it)
- Restrict `/api/admin/*` and `/dashboard` at the reverse-proxy level if you want defence in depth
- Review the rate-limit windows in `src/lib/rate-limit.ts` for your traffic profile
