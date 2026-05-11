import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enqueueAclSync } from "@/lib/queue/producers";
import { verifyMagentoWebhook } from "@/lib/magento/verify";
import {
  CONTRACT_VERSION,
  HEADERS,
  envelopeSchema,
  MAGENTO_EVENTS,
} from "@/lib/magento/types";

// Always run in the Node runtime — we need crypto + Prisma + Redis (BullMQ),
// none of which are Edge-compatible.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(
  status: number,
  code: string,
  message?: string,
): NextResponse {
  return NextResponse.json(
    message ? { status: "error", code, message } : { status: "error", code },
    { status },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.MAGENTO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[magento webhook] MAGENTO_WEBHOOK_SECRET not configured");
    return jsonError(500, "server_error", "Webhook secret not configured");
  }

  // Read the body as raw text BEFORE parsing JSON — the signature is over
  // the exact bytes sent, not over a re-serialized representation.
  const rawBody = await request.text();

  const verification = verifyMagentoWebhook({
    rawBody,
    timestamp: request.headers.get(HEADERS.timestamp),
    signature: request.headers.get(HEADERS.signature),
    secret,
  });
  if (!verification.ok) {
    return jsonError(verification.status, verification.code);
  }

  // Contract version sanity check (warn-only — we accept anything for v1
  // and rely on the schema validation below to catch real incompatibilities).
  const contractVersion = request.headers.get(HEADERS.contractVersion);
  if (contractVersion && contractVersion !== CONTRACT_VERSION) {
    console.warn(
      `[magento webhook] contract version mismatch: sender=${contractVersion} expected=${CONTRACT_VERSION}`,
    );
  }

  // Parse the JSON body and validate the envelope shape.
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonError(400, "invalid_payload", "Body is not valid JSON");
  }

  const envelopeResult = envelopeSchema.safeParse(parsedBody);
  if (!envelopeResult.success) {
    return jsonError(
      400,
      "invalid_payload",
      envelopeResult.error.issues[0]?.message ?? "Envelope failed validation",
    );
  }
  const envelope = envelopeResult.data;

  // Cross-check the event-name header against the body — they must agree.
  const headerEvent = request.headers.get(HEADERS.event);
  if (headerEvent && headerEvent !== envelope.event) {
    return jsonError(
      400,
      "invalid_payload",
      `Header event '${headerEvent}' does not match body event '${envelope.event}'`,
    );
  }
  if (!MAGENTO_EVENTS.includes(envelope.event)) {
    return jsonError(422, "unsupported_event");
  }

  // Same for event_id header vs body.
  const headerEventId = request.headers.get(HEADERS.eventId);
  if (headerEventId && headerEventId !== envelope.event_id) {
    return jsonError(
      400,
      "invalid_payload",
      "event_id header does not match body",
    );
  }

  // Idempotency check. Race-safe via the unique index on eventId — if two
  // copies of the same event arrive in parallel, exactly one createMany
  // call wins and the other gets count=0.
  const inserted = await prisma.webhookEvent.createMany({
    data: {
      eventId: envelope.event_id,
      source: "magento",
      event: envelope.event,
    },
    skipDuplicates: true,
  });

  if (inserted.count === 0) {
    return NextResponse.json(
      { status: "already_processed", event_id: envelope.event_id },
      { status: 200 },
    );
  }

  try {
    await enqueueAclSync({
      source: "magento",
      event: envelope.event,
      eventId: envelope.event_id,
      envelope,
    });
  } catch (err) {
    // If the enqueue fails we want Magento to retry — roll back the dedup
    // row so the retry actually does work next time.
    await prisma.webhookEvent
      .delete({ where: { eventId: envelope.event_id } })
      .catch(() => {});
    console.error("[magento webhook] enqueue failed:", err);
    return jsonError(503, "server_error", "Queue unavailable, please retry");
  }

  return NextResponse.json(
    { status: "accepted", event_id: envelope.event_id },
    { status: 202 },
  );
}
