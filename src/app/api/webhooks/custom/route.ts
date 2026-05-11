import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logAudit } from "@/lib/audit";

function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expected}`),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-webhook-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const event = request.headers.get("x-webhook-event") || body.event;

  await logAudit("webhook.custom.received", null, {
    event,
    source: body.source,
  });

  return NextResponse.json({ received: true, event });
}
