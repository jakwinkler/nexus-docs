/**
 * Magento → Nexus Docs webhook contract v1.
 *
 * See docs/MAGENTO_WEBHOOK_CONTRACT.md for the full specification.
 * Keep this file in sync with the wire format Magento sends.
 */

import { z } from "zod";

export const CONTRACT_VERSION = "1";
export const SIGNATURE_DRIFT_SECONDS = 300; // 5 minutes

// ─── Header names ─────────────────────────────────────
export const HEADERS = {
  contractVersion: "x-qoliber-contract-version",
  event: "x-qoliber-event",
  eventId: "x-qoliber-event-id",
  timestamp: "x-qoliber-timestamp",
  signature: "x-qoliber-signature",
} as const;

// ─── Event names ──────────────────────────────────────
export const MAGENTO_EVENTS = [
  "license.granted",
  "license.revoked",
  "license.expired_pinned",
  "partner.flag_changed",
] as const;
export type MagentoEvent = (typeof MAGENTO_EVENTS)[number];

// ─── Sub-schemas ──────────────────────────────────────
const customerSchema = z.object({
  magento_id: z.number().int().positive(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  company: z.string().optional(),
  tier: z.enum(["public", "client", "partner"]).optional(),
  partner_status: z
    .enum(["prospect", "active", "paused", "terminated"])
    .nullable()
    .optional(),
  partner_level: z.enum(["bronze", "silver", "gold"]).nullable().optional(),
});

const extensionSchema = z.object({
  slug: z.string().min(1),
  name: z.string().optional(),
});

// ─── Event payload schemas ────────────────────────────
export const licenseGrantedDataSchema = z.object({
  license_id: z.number().int(),
  customer: customerSchema.required({
    email: true,
    name: true,
    tier: true,
  }),
  extension: extensionSchema,
  packages: z.array(z.string()).default([]),
  license_duration: z.enum(["yearly", "lifetime"]),
  paid_at: z.string().datetime({ offset: true }).optional(),
  expires_at: z.string().datetime({ offset: true }).nullable(),
  is_renewal: z.boolean().default(false),
});

export const licenseRevokedDataSchema = z.object({
  license_id: z.number().int(),
  customer: z.object({ magento_id: z.number().int().positive() }),
  extension: extensionSchema,
  reason: z.enum(["refund", "manual_revoke", "order_cancelled"]),
});

export const licenseExpiredPinnedDataSchema = z.object({
  license_id: z.number().int(),
  customer: z.object({ magento_id: z.number().int().positive() }),
  extension: extensionSchema,
  packages: z.array(z.string()).default([]),
  expired_at: z.string().datetime({ offset: true }),
  version_pin: z.string().optional(),
});

export const partnerFlagChangedDataSchema = z.object({
  customer: customerSchema.required({ tier: true }),
  previous_tier: z.string().optional(),
});

// ─── Envelope ─────────────────────────────────────────
// Envelope shape is the same for every event; `data` is event-specific.
// We don't validate the inner `data` at envelope-parse time so the handler
// can pick the right schema based on the `event` field.
export const envelopeSchema = z.object({
  event: z.enum(MAGENTO_EVENTS),
  event_id: z.string().uuid(),
  occurred_at: z.string().datetime({ offset: true }),
  magento_store_id: z.number().int().nonnegative().optional(),
  data: z.record(z.unknown()),
});

export type MagentoEnvelope = z.infer<typeof envelopeSchema>;
export type LicenseGrantedData = z.infer<typeof licenseGrantedDataSchema>;
export type LicenseRevokedData = z.infer<typeof licenseRevokedDataSchema>;
export type LicenseExpiredPinnedData = z.infer<typeof licenseExpiredPinnedDataSchema>;
export type PartnerFlagChangedData = z.infer<typeof partnerFlagChangedDataSchema>;

// ─── Response shapes ──────────────────────────────────
export type WebhookErrorCode =
  | "invalid_payload"
  | "invalid_signature"
  | "stale_timestamp"
  | "missing_header"
  | "unsupported_event"
  | "server_error";
