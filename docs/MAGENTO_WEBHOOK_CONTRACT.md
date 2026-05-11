# Nexus Docs ↔ Magento Integration Contract

This is the wire contract between a Magento extension store and Nexus Docs.
Magento codes against this contract; Nexus Docs implements it. Either side can be developed and tested independently against a mock that follows this spec.

**Contract version: v1** — sent as `X-Qoliber-Contract-Version: 1` on every request.

> Implemented in `src/app/api/webhooks/magento/route.ts` (endpoint), `src/lib/magento/verify.ts` (signature), `worker/jobs/acl-sync.ts` (processor).

---

## Scope (v1)

**In scope:**
- One-way webhook, Magento → Nexus Docs
- Four event types: `license.granted`, `license.revoked`, `license.expired_pinned`, `partner.flag_changed`
- HMAC-SHA256 signed bodies, replay-protected
- Idempotent processing on the Nexus Docs side via `event_id`

**Out of scope (v1):**
- Nexus Docs → Magento callbacks. Future: a scheduled reconciliation pull.
- Synchronous responses with business data. Nexus Docs returns `202 Accepted` immediately and processes asynchronously via its BullMQ worker (`acl-sync` job).

---

## Endpoint

```
POST {nexus_docs_url}/api/webhooks/magento
```

For local dev, point Magento at a mock server or at `http://localhost:3333/api/webhooks/magento`.

## Required request headers

| Header | Description |
|---|---|
| `Content-Type` | Always `application/json` |
| `X-Qoliber-Contract-Version` | `1` (current) |
| `X-Qoliber-Event` | One of the event names below |
| `X-Qoliber-Event-Id` | UUID v4, unique per event; basis for idempotency |
| `X-Qoliber-Timestamp` | Unix seconds at signing time |
| `X-Qoliber-Signature` | `sha256=<lowercase hex digest>` |

## Authentication — HMAC-SHA256

Both sides share a secret:
- Magento: `qoliber/partner_portal/nexus_docs/hmac_secret` (encrypted in `core_config_data`)
- Nexus Docs: `MAGENTO_WEBHOOK_SECRET` env var

**Signing input** (verbatim concatenation):
```
{X-Qoliber-Timestamp}.{raw request body}
```

No JSON re-serialization, no whitespace normalization — sign the exact bytes you send.

**Algorithm:** `HMAC-SHA256(secret, signing_input)` → lowercase hex digest. Header value is `sha256=<digest>`.

**Verification (Nexus Docs side):**
- Reject `408 Request Timeout` if `|now() - timestamp| > 300` (5-minute drift window)
- Reject `401 Unauthorized` if signatures don't match (constant-time compare)
- Return `200` with `{ status: "already_processed" }` if `event_id` already seen
- Otherwise enqueue `acl-sync` job and return `202`

### Reference snippets

**PHP (Magento side):**
```php
$signingInput = $timestamp . '.' . $rawBody;
$signature    = 'sha256=' . hash_hmac('sha256', $signingInput, $secret);
```

**TypeScript (Nexus Docs side):** see `src/lib/magento/verify.ts`.

---

## Idempotency

Magento generates a UUID v4 `event_id` per event and resends the same `event_id` on retry. Nexus Docs maintains a `webhook_events` table with a 30-day retention window:

- First time seen → enqueue, `202 Accepted`
- Already processed → no enqueue, `200 OK` with `{ status: "already_processed" }`

This makes Magento retries safe.

---

## Common envelope

```json
{
  "event": "license.granted",
  "event_id": "0a1b2c3d-9b85-4d20-9a3e-bbbcec6bd5f0",
  "occurred_at": "2026-05-10T14:30:00+00:00",
  "magento_store_id": 1,
  "data": { ... }
}
```

## Events

### `license.granted`

Fired when a license is provisioned — both new purchases and renewals. Triggers ACL sync; for new users (`User.passwordHash IS NULL`), also triggers an Invitation email.

```json
{
  "event": "license.granted",
  "event_id": "0a1b2c3d-9b85-4d20-9a3e-bbbcec6bd5f0",
  "occurred_at": "2026-05-10T14:30:00+00:00",
  "magento_store_id": 1,
  "data": {
    "license_id": 4521,
    "customer": {
      "magento_id": 17,
      "email": "merchant@example.com",
      "name": "Anna Example",
      "company": "Example Sp. z o.o.",
      "tier": "client",
      "partner_status": null,
      "partner_level": null
    },
    "extension": {
      "slug": "qoliber-gdpr-suite",
      "name": "GDPR Compliance Suite"
    },
    "packages": ["qoliber/gdpr-cookie", "qoliber/gdpr-consent"],
    "license_duration": "yearly",
    "paid_at": "2026-05-10T14:25:00+00:00",
    "expires_at": "2027-05-10T14:25:00+00:00",
    "is_renewal": false
  }
}
```

**Nexus Docs behavior:**
1. Lookup User by `magento_id`; fall back to `email`; else create.
2. Upsert `UserPermission` row: `(userId, extension=data.extension.slug, expiresAt=data.expires_at)`.
3. If `User.passwordHash IS NULL`: create Invitation; send invitation email.
4. Audit: `magento.license.granted`.
5. Never downgrade an existing higher tier.

### `license.revoked`

Fired on manual revoke or refund. Removes the matching `UserPermission`. The User stays (they may own other licenses).

```json
{
  "event": "license.revoked",
  "data": {
    "license_id": 4521,
    "customer": { "magento_id": 17 },
    "extension": { "slug": "qoliber-gdpr-suite" },
    "reason": "refund"
  }
}
```

`reason` ∈ `refund | manual_revoke | order_cancelled`.

**Nexus Docs behavior:**
1. Delete `UserPermission` where `userId = user_for(magento_id) AND extension = slug`.
2. If user has zero remaining permissions AND `tier != partner|admin`: downgrade `User.tier` to `public`.
3. Audit: `magento.license.revoked`.

### `license.expired_pinned`

Fired by the Magento daily cron when a yearly license's expiry passes. **Does not change ACL** (per design: docs access stays after expiry).

```json
{
  "event": "license.expired_pinned",
  "data": {
    "license_id": 4521,
    "customer": { "magento_id": 17 },
    "extension": { "slug": "qoliber-gdpr-suite" },
    "packages": ["qoliber/gdpr-cookie"],
    "expired_at": "2027-05-10T14:25:00+00:00",
    "version_pin": "<=2.5.3"
  }
}
```

**Nexus Docs behavior:** audit only.

### `partner.flag_changed`

Fired when a customer's Partners group membership, `partner_status`, or `partner_level` changes.

```json
{
  "event": "partner.flag_changed",
  "data": {
    "customer": {
      "magento_id": 17,
      "email": "merchant@example.com",
      "tier": "partner",
      "partner_status": "active",
      "partner_level": "gold"
    },
    "previous_tier": "client"
  }
}
```

**Nexus Docs behavior:**
1. Update `User.tier` to `data.customer.tier`.
2. Audit: `magento.partner.flag_changed`.

---

## Responses

| Status | When | Body |
|---|---|---|
| `202 Accepted` | Event accepted, enqueued | `{ "status": "accepted", "event_id": "..." }` |
| `200 OK` | Duplicate `event_id` | `{ "status": "already_processed", "event_id": "..." }` |
| `400 Bad Request` | Invalid JSON or schema | `{ "status": "error", "code": "invalid_payload", ... }` |
| `401 Unauthorized` | Signature missing or mismatch | `{ "status": "error", "code": "invalid_signature" }` |
| `408 Request Timeout` | Timestamp drift > 5 min | `{ "status": "error", "code": "stale_timestamp" }` |
| `422 Unprocessable Entity` | Schema valid, unknown event | `{ "status": "error", "code": "...", "message": "..." }` |
| `500/503` | Server error | (retry expected from Magento) |

4xx responses are terminal for that `event_id` — Magento does not retry. 5xx and network errors are retryable up to 5 attempts.

---

## Versioning

This contract is **v1**. The header `X-Qoliber-Contract-Version: 1` is sent on every request. Incompatible changes will bump the version with a deprecation window of at least 30 days.

## Changelog

### v1 — 2026-05-11
Initial release.
