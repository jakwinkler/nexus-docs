# Nexus Knowledge Base -- Code Review

**Reviewer:** Claude Opus 4.6
**Date:** 2026-03-21
**Scope:** Full review of `src/`, `worker/`, `scripts/`, and `prisma/schema.prisma`

---

## Summary

The Nexus Knowledge Base is a well-structured Next.js 15 application with a clear separation between public docs, admin portal, API routes, and background workers. The codebase demonstrates good patterns in many areas (Zod validation on API inputs, ACL enforcement, proper use of server components, BullMQ for background jobs). However, the project has **zero test coverage**, several race conditions in concurrent access-request processing, security gaps in the webhook and email systems, duplicated logic across multiple files, and a nav-builder that silently drops deeply nested orphan pages.

---

## Critical Issues (Must Fix)

### C1. Race condition in access request approve/deny (TOCTOU)

**Files:**
- `src/app/api/access/[id]/approve/route.ts` (lines 18-42)
- `src/app/api/access/[id]/deny/route.ts` (lines 18-41)

Both routes perform a `findUnique` followed by a separate `update` without any transaction or optimistic locking. Two admins clicking "Approve" and "Deny" simultaneously on the same request can both pass the `status !== "pending"` check, resulting in the last write winning. The approve route may also upgrade a user's tier, making this a privilege-escalation risk.

**Fix:** Wrap the read+write in a `prisma.$transaction` with serializable isolation, or use an atomic `updateMany` with a `where: { id, status: "pending" }` clause and check `count === 0` for conflict.

```ts
const result = await prisma.accessRequest.updateMany({
  where: { id, status: "pending" },
  data: { status: "approved", reviewerId: session.user.id, ... },
});
if (result.count === 0) {
  return NextResponse.json({ error: "Already processed" }, { status: 409 });
}
```

### C2. Content cache is a module-level singleton with no concurrency safety

**File:** `src/lib/content/loader.ts` (lines 7, 87-113, 121-123)

`docCache` is a module-level `Map` that is populated by `getAllDocs()` and cleared by `invalidateCache()`. Problems:

1. If two concurrent requests call `getAllDocs()` when `docCache` is null, both will read the filesystem in parallel, wasting resources and potentially returning inconsistent results if content changes between reads.
2. `invalidateCache()` sets `docCache = null` but any in-progress `getAllDocs()` call will overwrite it with stale data after invalidation completes.
3. In serverless deployments (Vercel), this cache is per-isolate and offers no cross-instance consistency.

**Fix:** Use `unstable_cache` from Next.js or implement a mutex pattern. For serverless, consider Redis-backed caching.

### C3. XSS vulnerability in email templates

**File:** `worker/jobs/email-notify.ts` (lines 56-79)

The `renderTemplate` function interpolates user-supplied data (`data.userName`, `data.userEmail`, `data.message`, `data.pagePath`) directly into HTML strings without escaping. A malicious user name like `<script>alert(1)</script>` will be rendered as executable HTML in the recipient's email client.

**Fix:** Escape all interpolated values with an HTML-escape utility before inserting into templates.

### C4. GitLab webhook token comparison is not timing-safe

**File:** `src/app/api/webhooks/gitlab/route.ts` (line 13)

```ts
if (token !== secret) {
```

This uses JavaScript's `!==` operator for secret comparison, which is vulnerable to timing attacks. The custom webhook route correctly uses `crypto.timingSafeEqual` (line 15 of `custom/route.ts`), but the GitLab route does not.

**Fix:** Use `crypto.timingSafeEqual(Buffer.from(token || ""), Buffer.from(secret))` (with length check).

### C5. Unused `crypto` import in GitLab webhook route

**File:** `src/app/api/webhooks/gitlab/route.ts` (line 2)

`crypto` is imported but never used. This import exists because HMAC verification was apparently planned but not implemented. Combined with C4, the webhook verification is incomplete.

### C6. `request.json()` called without try/catch on multiple API routes

**Files:**
- `src/app/api/webhooks/gitlab/route.ts` (line 18) -- if body is not valid JSON, this throws an unhandled error
- `src/app/api/issues/route.ts` (line 18)
- `src/app/api/access/request/route.ts` (line 19)
- `src/app/api/admin/users/[id]/route.ts` (line 58)
- `src/app/api/admin/users/[id]/permissions/route.ts` (line 21)

A malformed request body will result in a 500 error instead of a proper 400 response.

**Fix:** Wrap in `try/catch` or use `.catch(() => null)` pattern (already used in approve/deny routes).

### C7. Worker creates new PrismaClient instances without connection pooling control

**Files:**
- `worker/jobs/content-sync.ts` (line 7)
- `worker/jobs/webhook-deliver.ts` (line 5)

Each worker file creates `new PrismaClient()` at module scope. Since the worker process is long-lived, these are fine for single instances, but if multiple worker processes start, each gets its own connection pool. More critically, there is no `prisma.$disconnect()` in the shutdown handler (`worker/index.ts` lines 46-50), which can cause connection leaks.

**Fix:** Create a shared Prisma instance in a `worker/db.ts` file and disconnect it in the shutdown handler.

---

## Medium Issues (Should Fix)

### M1. Duplicated `walkDir` and `stripMdx` functions

The `walkDir` function is copied in three places:
- `src/lib/content/loader.ts` (lines 66-85)
- `worker/jobs/content-sync.ts` (lines 18-35)
- `worker/jobs/reindex.ts` (lines 24-41)

`stripMdx` is duplicated in:
- `src/lib/meilisearch/indexer.ts` (lines 22-31)
- `worker/jobs/reindex.ts` (lines 13-22)

**Fix:** Extract into shared utility modules.

### M2. `indexAllDocs()` has an N+1 query pattern

**File:** `src/lib/meilisearch/indexer.ts` (lines 33-67)

Calls `getAllDocs()` to get metadata, then calls `getDocBySlug()` individually for each doc to get content. Each `getDocBySlug()` does `fs.access()` + `fs.readFile()` + `fs.stat()`. This means every file is read twice (once during `getAllDocs` and once during `getDocBySlug`).

**Fix:** Create a `getAllDocsWithContent()` function, or modify `getAllDocs` to optionally include content.

### M3. Search query parameter not sanitized for Meilisearch filter injection

**Files:**
- `src/app/api/search/route.ts` (line 39)
- `src/app//(public)/search/page.tsx` (line 55)

The `product` query parameter is directly interpolated into a Meilisearch filter string:
```ts
if (product) filters.push(`product = "${product}"`);
```

A `product` value containing `"` could break the filter syntax or inject additional filter clauses.

**Fix:** Validate/sanitize the `product` parameter or use Meilisearch's parameterized filter API.

### M4. Middleware only checks `tier !== "admin"` -- no RBAC for dashboard

**File:** `src/middleware.ts` (lines 8-21)

The middleware redirects non-admin users from `/dashboard` and `/admin` paths, but the `/dashboard` path is also accessible to non-admin authenticated users since they pass the `!req.auth` check. However, line 18 checks for `admin` tier specifically. This means authenticated non-admin users hitting `/dashboard` get silently redirected to `/` with no error message.

Additionally, if a future "editor" role is added, the middleware will need updating. Consider a role-based approach.

### M5. `AccessRequestActions` component does not handle errors

**File:** `src/app/(portal)/admin/access-requests/actions.tsx` (lines 10-18)

The `handleAction` function calls `fetch()` but never checks `res.ok` or handles errors. If the API returns a 409 (already processed) or 500, the UI silently refreshes without feedback.

**Fix:** Check the response status and display an error message to the user.

### M6. `LockedContent` access request does not check response status

**File:** `src/components/issues/locked-content.tsx` (lines 84-101)

Same issue -- `fetch()` is called but the response is not checked for errors before showing the success message.

### M7. `ReportIssue` component does not handle API errors

**File:** `src/components/issues/report-issue.tsx` (lines 22-35)

If the API returns an error, `result` is set to the error response object (which lacks `issueUrl`/`branchName`), causing the "success" view to render with broken links.

### M8. GitLab webhook route has commented-out content sync

**File:** `src/app/api/webhooks/gitlab/route.ts` (lines 33-35)

The actual content sync enqueue is commented out:
```ts
// const { enqueueContentSync } = await import("@/lib/queue/producers");
// await enqueueContentSync({ fullSync: true });
```

The webhook receives events and logs them but never triggers the content sync pipeline. This makes the GitLab integration non-functional.

### M9. No expiration check for `UserPermission`

**File:** `prisma/schema.prisma` (line 89)

`UserPermission` has an `expiresAt` field, but the ACL check in `src/app/(public)/docs/[...slug]/page.tsx` and `src/app/api/search/route.ts` fetches permissions without filtering by expiration:
```ts
const permissions = await prisma.userPermission.findMany({
  where: { userId: session.user.id },
  select: { extension: true },
});
```

**Fix:** Add `expiresAt: { gt: new Date() }` or `OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]` to the where clause.

### M10. `SearchDialogWrapper` in root layout is unnecessary indirection

**File:** `src/app/layout.tsx` (lines 5-7)

```ts
function SearchDialogWrapper() {
  return <SearchDialog />;
}
```

This wrapper adds no value. It was likely intended to add Suspense or providers but currently just wraps `SearchDialog` with an extra component layer.

### M11. `where` typed as `Record<string, unknown>` in admin API routes

**Files:**
- `src/app/api/admin/access-requests/route.ts` (line 16)
- `src/app/api/admin/audit-log/route.ts` (line 19)
- `src/app/api/admin/users/route.ts` (line 17)
- `src/app/(portal)/admin/access-requests/page.tsx` (line 19)
- `src/app/(portal)/admin/audit-log/page.tsx` (line 17)
- `src/app/(portal)/admin/users/page.tsx` (line 18)

Using `Record<string, unknown>` bypasses Prisma's type checking for where clauses. This means invalid filter values won't be caught at compile time.

**Fix:** Use Prisma's generated `Prisma.AccessRequestWhereInput` (etc.) types.

### M12. Pagination parameters not validated

All paginated endpoints (`/api/admin/users`, `/api/admin/audit-log`, `/api/admin/access-requests`, `/api/search`) use `parseInt()` on query params without validating they are positive integers. A negative `page` value would produce a negative `skip`, which Prisma rejects with an error.

**Fix:** Add `Math.max(1, page)` and validate limit bounds.

### M13. `docs/page.tsx` imports `MdxRenderer` but never uses it properly when doc is null

**File:** `src/app/(public)/docs/page.tsx` (line 3)

`MdxRenderer` is imported but only used conditionally. When there is no `index.md` file, the fallback renders static HTML. This is not a bug but the import of `Sidebar` is unused data -- the `allDocs` fetch still runs even when no sidebar filtering is applied for the logged-out user.

### M14. Duplicate permission/ACL lookup logic

The same pattern for fetching user permissions and building ACL context appears in three places:
- `src/app/(public)/docs/[...slug]/page.tsx` (lines 52-71)
- `src/app/api/search/route.ts` (lines 20-32)
- `src/app/(public)/search/page.tsx` (lines 37-50)

**Fix:** Extract a `getUserACLFromSession()` helper.

---

## Low Issues (Nice to Fix)

### L1. No loading states or Suspense boundaries for data-heavy pages

Admin pages (`dashboard`, `users`, `access-requests`, `audit-log`, `content`) are server components that fetch data synchronously. While this works, there are no `loading.tsx` files providing skeleton UIs during streaming.

### L2. `Sidebar` uses `usePathname()` but receives no callback for navigation

**File:** `src/components/layout/sidebar.tsx` (line 31)

The sidebar re-renders on every navigation but has no mechanism to expand/collapse sections based on the current path. Deeply nested sections will appear closed.

### L3. `ThemeToggle` flashes on hydration

**File:** `src/components/layout/theme-toggle.tsx` (lines 7-11)

The initial state is `useState(false)` regardless of the actual theme. The `useEffect` sets the correct value after mount, causing a brief flash of the wrong icon.

**Fix:** Use `null` initial state and hide the button until hydrated, or read from the DOM in a `useSyncExternalStore`.

### L4. Footer renders `new Date().getFullYear()` -- not a bug but triggers hydration warnings in some edge cases

**File:** `src/components/layout/footer.tsx` (line 54)

Server-rendered year might differ from client-rendered year during deployment across midnight UTC.

### L5. `data-table.tsx` is imported but never used

**File:** `src/components/admin/data-table.tsx`

This generic DataTable component using TanStack Table is defined but no page actually uses it -- all admin pages manually render `<table>` elements.

### L6. Several dependencies in `package.json` appear unused

- `@hookform/resolvers`, `react-hook-form` -- no forms use react-hook-form
- `@react-email/components` -- email templates use raw HTML strings instead
- `framer-motion` -- no motion components found in any source file
- `recharts` -- no charts rendered anywhere
- `shiki` -- no syntax highlighting integration (CodeBlock is a plain `<pre>`)
- `ioredis` -- BullMQ uses its own connection; no direct ioredis usage found
- `class-variance-authority` -- no `cva()` calls found
- `remark-frontmatter` -- not passed to MDXRemote options

### L7. Seed script uses a hardcoded password

**File:** `scripts/seed.ts` (line 9)

`"password123"` is hardcoded. While this is a dev seed, it should at minimum log a warning or read from an environment variable.

### L8. `SignInPage` links to `/api/auth/signin` instead of `/auth/signin`

**File:** `src/components/issues/locked-content.tsx` (line 164)

The "Already a partner? Log in" link points to `/api/auth/signin` which is the NextAuth API route (will redirect), not the custom sign-in page at `/auth/signin`.

### L9. Breadcrumb uses `<a>` tags instead of Next.js `<Link>`

**File:** `src/app/(public)/docs/[...slug]/page.tsx` (lines 146-163)

Breadcrumb links use raw `<a>` tags, bypassing Next.js client-side navigation and triggering full page reloads.

### L10. Queue connection config duplicated

**Files:**
- `src/lib/queue/connection.ts` -- defines `redisConnection` but is never imported
- `src/lib/queue/queues.ts` (lines 3-6) -- redefines connection inline
- `worker/index.ts` (lines 7-10) -- redefines connection inline

`connection.ts` was created as a shared module but is unused.

### L11. `redisConnection` in `connection.ts` does not handle `redisUrl` with authentication

**File:** `src/lib/queue/connection.ts`

If `REDIS_URL` contains a password (e.g., `redis://:password@host:6379`), only `hostname` and `port` are extracted -- the password is lost.

**Fix:** Include `password: redisUrl.password || undefined` in the connection config.

---

## Nav-Builder Edge Cases

**File:** `src/lib/content/nav-builder.ts`

### Deeply nested content (> 2 levels)

The builder only looks one level up for a grandparent (line 65-75). For content at depth 4+ (e.g., `a/b/c/d`), intermediate ancestors are not created. Document `a/b/c/d` will check for parent `a/b/c`, and if not found, creates a section node and checks for grandparent `a/b`. If `a/b` also doesn't exist (no doc at that slug), the section is pushed to root -- orphaning it from the expected tree structure.

**Fix:** Use a recursive ancestor-creation loop that walks up the slug path until it finds an existing node or reaches root.

### Orphaned pages

If a document at `products/widgets/pricing` exists but no document exists at `products/widgets` or `products`, the builder creates a synthetic section node for `products/widgets` but only checks one level up for `products`. If `products` is also missing, the `products/widgets` section ends up at root level, disconnected from any `products` section that might be created later when processing other documents.

### Duplicate section nodes

If document `a/b` doesn't exist as a real doc, and two child documents `a/b/x` and `a/b/y` are processed, the first creates a synthetic section for `a/b` and adds it to root. The second finds `a/b` in `nodeMap` and correctly adds to it. However, if `a/b/x` was processed and `a/b` was pushed to root, then document `a/b` is later processed as a real doc, a new node replaces the synthetic one in `nodeMap` but the synthetic (with children) is already in root -- creating a duplicate.

### Circular references in `related` docs

The `related` field in frontmatter is not processed by the nav-builder at all -- it's stored in metadata but never traversed. So circular references in `related` are not a risk for the nav-builder specifically, but any future feature that resolves `related` links should guard against cycles.

### No key uniqueness guarantee

**Line 40:** `key={item.title}` in the Sidebar component uses `title` as the React key. If two sibling nav items share the same title, React will have key collisions causing rendering bugs.

---

## Recommended Test Plan

The project has test infrastructure set up (`vitest`, `@testing-library/react`, `jsdom` in devDependencies) but **zero test files**. Every module needs coverage.

### Unit Tests

| Test File | Module Under Test | Key Test Cases |
|---|---|---|
| `src/lib/acl/__tests__/index.test.ts` | `canAccessDoc`, `getAccessFilter`, `getUserACLContext` | All tier combinations, extension gating, empty extensions, null user, admin bypass |
| `src/lib/content/__tests__/frontmatter.test.ts` | `validateFrontmatter` | Valid schema, missing required fields, defaults, invalid enum values |
| `src/lib/content/__tests__/nav-builder.test.ts` | `buildNavTree` | Flat list, nested 2 levels, nested 4+ levels, orphan pages, duplicate slugs, hidden docs, draft filtering, sort order, locked nodes |
| `src/lib/content/__tests__/loader.test.ts` | `getDocBySlug`, `getAllDocs`, `invalidateCache` | .md/.mdx resolution, index.md fallback, missing file, cache behavior, concurrent access |
| `src/lib/audit/__tests__/index.test.ts` | `logAudit` | Successful log, null userId, JSON data serialization |
| `src/lib/email/__tests__/send.test.ts` | `sendEmail` | Delegates to queue producer |
| `src/lib/gitlab/__tests__/client.test.ts` | `createIssue`, `createBranch`, `getFileHistory` | API success, API failure, URL encoding |
| `src/lib/meilisearch/__tests__/indexer.test.ts` | `indexAllDocs`, `indexDoc`, `removeDoc` | Doc transformation, MDX stripping, content truncation, draft exclusion |
| `src/lib/queue/__tests__/producers.test.ts` | All enqueue functions | Correct queue name, job data shape |

### API Route Tests

| Test File | Route | Key Test Cases |
|---|---|---|
| `src/app/api/search/__tests__/route.test.ts` | `GET /api/search` | Empty query, ACL filtering, product filter, pagination, Meilisearch down |
| `src/app/api/issues/__tests__/route.test.ts` | `POST /api/issues` | Validation, auth required, GitLab integration success/failure, audit logging |
| `src/app/api/access/request/__tests__/route.test.ts` | `POST /api/access/request` | Validation, duplicate check, auth required |
| `src/app/api/access/[id]/approve/__tests__/route.test.ts` | `POST /api/access/:id/approve` | Admin only, not found, already processed, tier upgrade, race condition |
| `src/app/api/access/[id]/deny/__tests__/route.test.ts` | `POST /api/access/:id/deny` | Admin only, not found, already processed |
| `src/app/api/admin/users/__tests__/route.test.ts` | `GET /api/admin/users` | Admin only, pagination, search, tier filter |
| `src/app/api/admin/users/[id]/__tests__/route.test.ts` | `GET/PATCH /api/admin/users/:id` | Get user, update validation, not found |
| `src/app/api/admin/users/[id]/permissions/__tests__/route.test.ts` | `POST/DELETE /api/admin/users/:id/permissions` | Grant, revoke, duplicate grant (upsert), missing extension param |
| `src/app/api/admin/access-requests/__tests__/route.test.ts` | `GET /api/admin/access-requests` | Admin only, status filter, pagination |
| `src/app/api/admin/audit-log/__tests__/route.test.ts` | `GET /api/admin/audit-log` | Admin only, event filter, date range, pagination |
| `src/app/api/admin/content/__tests__/route.test.ts` | `GET /api/admin/content` | Admin only, stale calculation, product grouping |
| `src/app/api/admin/stats/__tests__/route.test.ts` | `GET /api/admin/stats` | Admin only, aggregation accuracy |
| `src/app/api/webhooks/gitlab/__tests__/route.test.ts` | `POST /api/webhooks/gitlab` | Token validation, merge request handling, push handling |
| `src/app/api/webhooks/custom/__tests__/route.test.ts` | `POST /api/webhooks/custom` | Signature verification, invalid signature, missing signature |

### Worker Tests

| Test File | Worker | Key Test Cases |
|---|---|---|
| `worker/jobs/__tests__/content-sync.test.ts` | `processContentSync` | New files detected, unchanged files skipped, hash comparison |
| `worker/jobs/__tests__/reindex.test.ts` | `processReindex` | Full reindex, draft exclusion, MDX stripping |
| `worker/jobs/__tests__/email-notify.test.ts` | `processEmail` | Resend provider, no-provider fallback, all templates |
| `worker/jobs/__tests__/webhook-deliver.test.ts` | `processWebhookDeliver` | Successful delivery, failed delivery (retry), inactive webhook, timeout |

### Component Tests

| Test File | Component | Key Test Cases |
|---|---|---|
| `src/components/layout/__tests__/sidebar.test.tsx` | `Sidebar` | Renders items, active state, locked items, nested children |
| `src/components/issues/__tests__/locked-content.test.tsx` | `LockedContent` | All tier combinations, access request form, submission |
| `src/components/issues/__tests__/report-issue.test.tsx` | `ReportIssue` | Form display, submission, error handling |
| `src/components/search/__tests__/search-dialog.test.tsx` | `SearchDialog` | Open/close, keyboard nav, debounced search |
| `src/components/markdown/__tests__/mdx-renderer.test.tsx` | `MdxRenderer` | Renders markdown, custom components |
| `src/components/seo/__tests__/json-ld.test.tsx` | `JsonLd`, `DocPageJsonLd` | Correct schema output, breadcrumbs |

### Integration / E2E Tests

| Test File | Scenario |
|---|---|
| `e2e/auth-flow.test.ts` | Sign in, access admin, sign out |
| `e2e/doc-access.test.ts` | Public doc, locked doc, access request flow |
| `e2e/search.test.ts` | Search with results, empty results, ACL-filtered results |
| `e2e/admin-users.test.ts` | List users, update tier, grant/revoke permission |

### Middleware Tests

| Test File | Key Test Cases |
|---|---|
| `src/__tests__/middleware.test.ts` | Unauthenticated redirect, non-admin redirect, admin pass-through, public routes |

---

## Additional Recommendations

1. **Add a vitest config file** (`vitest.config.ts`) -- the devDependencies include vitest but there is no configuration.
2. **Add `loading.tsx` files** for admin pages to improve perceived performance.
3. **Consider rate limiting** on `/api/access/request` and `/api/issues` to prevent abuse.
4. **Add CSRF protection** for state-changing API routes (POST/PATCH/DELETE).
5. **Move shared types** (AccessTier, UserTier) to a single source of truth -- currently `AccessTier` is defined in `content/types.ts` and `UserTier` comes from Prisma, creating potential drift.
6. **Add health check endpoint** (`/api/health`) that verifies database and Redis connectivity.
7. **Add structured logging** instead of `console.log`/`console.error` in worker processes.
8. **Consider using Next.js `revalidatePath`/`revalidateTag`** instead of the manual module-level cache for content.
