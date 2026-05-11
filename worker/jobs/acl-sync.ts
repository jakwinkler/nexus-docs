import type { Job } from "bullmq";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import {
  envelopeSchema,
  licenseGrantedDataSchema,
  licenseRevokedDataSchema,
  licenseExpiredPinnedDataSchema,
  partnerFlagChangedDataSchema,
  type LicenseGrantedData,
  type LicenseRevokedData,
  type LicenseExpiredPinnedData,
  type PartnerFlagChangedData,
} from "../../src/lib/magento/types";

const prisma = new PrismaClient();

interface AclSyncJobData {
  source: "magento";
  event: string;
  eventId: string;
  envelope: unknown;
}

/**
 * Process a Magento → Nexus Docs webhook event asynchronously.
 *
 * The endpoint has already verified the HMAC and recorded the event_id
 * in webhook_events for dedup. This worker decides what to actually
 * mutate based on the event type, then stamps webhook_events.processedAt
 * so failures and successes are distinguishable in audit.
 */
export async function processAclSync(job: Job<AclSyncJobData>): Promise<void> {
  const { eventId, envelope: rawEnvelope } = job.data;

  const envelopeResult = envelopeSchema.safeParse(rawEnvelope);
  if (!envelopeResult.success) {
    console.error(`[acl-sync ${eventId}] envelope reparse failed:`, envelopeResult.error);
    throw new Error("Envelope reparse failed — should not happen post-endpoint validation");
  }
  const envelope = envelopeResult.data;

  switch (envelope.event) {
    case "license.granted":
      await handleLicenseGranted(eventId, envelope.data);
      break;
    case "license.revoked":
      await handleLicenseRevoked(eventId, envelope.data);
      break;
    case "license.expired_pinned":
      await handleLicenseExpiredPinned(eventId, envelope.data);
      break;
    case "partner.flag_changed":
      await handlePartnerFlagChanged(eventId, envelope.data);
      break;
    default:
      throw new Error(`Unknown event: ${envelope.event}`);
  }

  await prisma.webhookEvent.update({
    where: { eventId },
    data: { processedAt: new Date() },
  });

  job.updateProgress(100);
}

// ─── license.granted ─────────────────────────────────
async function handleLicenseGranted(eventId: string, raw: unknown): Promise<void> {
  const parsed = licenseGrantedDataSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `[acl-sync ${eventId}] license.granted payload invalid: ${parsed.error.issues[0]?.message}`,
    );
  }
  const data: LicenseGrantedData = parsed.data;
  const { customer, extension, expires_at } = data;
  const magentoId = String(customer.magento_id);

  // Find or create the user. Lookup order:
  //   1. magentoId (canonical link)
  //   2. email     (link an existing OAuth/credentials user)
  //   3. create new
  const existingByMagento = await prisma.user.findUnique({
    where: { magentoId },
  });

  const user = existingByMagento
    ? await prisma.user.update({
        where: { id: existingByMagento.id },
        data: {
          email: customer.email,
          name: customer.name ?? existingByMagento.name,
          tier: maxTier(existingByMagento.tier, customer.tier ?? "client"),
        },
      })
    : await upsertByEmailOrCreate({
        magentoId,
        email: customer.email,
        name: customer.name,
        tier: customer.tier ?? "client",
      });

  // Upsert the extension permission.
  await prisma.userPermission.upsert({
    where: {
      userId_extension: {
        userId: user.id,
        extension: extension.slug,
      },
    },
    update: {
      expiresAt: expires_at ? new Date(expires_at) : null,
      grantedBy: "magento",
    },
    create: {
      userId: user.id,
      extension: extension.slug,
      expiresAt: expires_at ? new Date(expires_at) : null,
      grantedBy: "magento",
    },
  });

  // If the user has no password set and has no active session, fire an
  // invitation email so they can set one up. Implementation detail: we
  // create a fresh Invitation row even if one was sent earlier — the
  // accept route checks acceptedAt and a one-time token, so this is safe.
  if (!user.passwordHash) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 86400000);
    await prisma.invitation.create({
      data: {
        email: user.email,
        token,
        extensions: [extension.slug],
        tier: customer.tier ?? "client",
        invitedBy: "magento",
        expiresAt,
      },
    });
    // Use a dynamic import so the worker doesn't pull the email module
    // (and its big nodemailer dep) eagerly at startup.
    const [{ sendEmailDirect }, { invitationEmail }] = await Promise.all([
      import("../../src/lib/email/send"),
      import("../../src/lib/email/templates"),
    ]);
    const siteUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";
    const { subject, html } = invitationEmail({
      acceptUrl: `${siteUrl}/auth/accept-invite?token=${token}`,
      extensions: [extension.slug],
      tier: customer.tier ?? "client",
      expiresAt,
    });
    await sendEmailDirect({ to: user.email, subject, html });
  }

  await audit("magento.license.granted", user.id, {
    eventId,
    licenseId: data.license_id,
    extension: extension.slug,
    isRenewal: data.is_renewal,
  });
}

// ─── license.revoked ─────────────────────────────────
async function handleLicenseRevoked(eventId: string, raw: unknown): Promise<void> {
  const parsed = licenseRevokedDataSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `[acl-sync ${eventId}] license.revoked payload invalid: ${parsed.error.issues[0]?.message}`,
    );
  }
  const data: LicenseRevokedData = parsed.data;
  const user = await prisma.user.findUnique({
    where: { magentoId: String(data.customer.magento_id) },
  });
  if (!user) {
    console.warn(
      `[acl-sync ${eventId}] license.revoked: no user for magento_id ${data.customer.magento_id} — nothing to do`,
    );
    return;
  }

  await prisma.userPermission.deleteMany({
    where: { userId: user.id, extension: data.extension.slug },
  });

  // If the user has no permissions left and isn't a partner/admin,
  // downgrade them. Avoids leaving inactive users floating at client tier.
  const remaining = await prisma.userPermission.count({
    where: { userId: user.id },
  });
  if (remaining === 0 && user.tier !== "partner" && user.tier !== "admin") {
    await prisma.user.update({
      where: { id: user.id },
      data: { tier: "public" },
    });
  }

  await audit("magento.license.revoked", user.id, {
    eventId,
    licenseId: data.license_id,
    extension: data.extension.slug,
    reason: data.reason,
  });
}

// ─── license.expired_pinned ──────────────────────────
async function handleLicenseExpiredPinned(eventId: string, raw: unknown): Promise<void> {
  const parsed = licenseExpiredPinnedDataSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `[acl-sync ${eventId}] license.expired_pinned payload invalid: ${parsed.error.issues[0]?.message}`,
    );
  }
  const data: LicenseExpiredPinnedData = parsed.data;
  const user = await prisma.user.findUnique({
    where: { magentoId: String(data.customer.magento_id) },
  });

  // Audit only — per spec, docs access stays after expiry.
  await audit("magento.license.expired_pinned", user?.id ?? null, {
    eventId,
    licenseId: data.license_id,
    extension: data.extension.slug,
    expiredAt: data.expired_at,
    versionPin: data.version_pin,
  });
}

// ─── partner.flag_changed ────────────────────────────
async function handlePartnerFlagChanged(eventId: string, raw: unknown): Promise<void> {
  const parsed = partnerFlagChangedDataSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `[acl-sync ${eventId}] partner.flag_changed payload invalid: ${parsed.error.issues[0]?.message}`,
    );
  }
  const data: PartnerFlagChangedData = parsed.data;
  const user = await prisma.user.findUnique({
    where: { magentoId: String(data.customer.magento_id) },
  });
  if (!user) {
    console.warn(
      `[acl-sync ${eventId}] partner.flag_changed: no user for magento_id ${data.customer.magento_id} — ignoring`,
    );
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { tier: data.customer.tier },
  });

  await audit("magento.partner.flag_changed", user.id, {
    eventId,
    previousTier: data.previous_tier,
    newTier: data.customer.tier,
    partnerStatus: data.customer.partner_status,
    partnerLevel: data.customer.partner_level,
  });
}

// ─── helpers ─────────────────────────────────────────

/**
 * Link an existing user (matched by email) to this magento_id, OR create
 * a new user. Used when license.granted fires for a customer who isn't
 * yet linked by magento_id (e.g. they signed up via GitLab earlier).
 */
async function upsertByEmailOrCreate(args: {
  magentoId: string;
  email: string;
  name: string | undefined;
  tier: string;
}): Promise<{ id: string; email: string; passwordHash: string | null; tier: string }> {
  const { magentoId, email, name, tier } = args;
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        magentoId,
        name: name ?? existingByEmail.name,
        tier: maxTier(existingByEmail.tier, tier),
      },
    });
  }
  return prisma.user.create({
    data: {
      magentoId,
      email,
      name: name ?? null,
      tier,
    },
  });
}

/**
 * Return the higher-rank tier between two — never downgrades an existing
 * user just because Magento says they're "client" if they're already
 * "partner" in Nexus Docs.
 */
function maxTier(a: string, b: string): string {
  const ranks: Record<string, number> = {
    public: 0,
    client: 10,
    partner: 20,
    gold_partner: 30,
    platinum_partner: 40,
    admin: 100,
  };
  return (ranks[b] ?? 0) > (ranks[a] ?? 0) ? b : a;
}

async function audit(
  event: string,
  userId: string | null,
  data: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog.create({
    data: { event, userId, data: data as object },
  });
}
