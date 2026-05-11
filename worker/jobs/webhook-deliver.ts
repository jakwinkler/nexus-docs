import type { Job } from "bullmq";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface WebhookDeliverData {
  registrationId: string;
  event: string;
  payload: unknown;
}

export async function processWebhookDeliver(job: Job<WebhookDeliverData>) {
  const { registrationId, event, payload } = job.data;

  const registration = await prisma.webhookRegistration.findUnique({
    where: { id: registrationId },
  });

  if (!registration || !registration.active) {
    console.log(`Webhook ${registrationId} not found or inactive`);
    return { skipped: true };
  }

  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  const signature = crypto
    .createHmac("sha256", registration.secret)
    .update(body)
    .digest("hex");

  let statusCode: number | null = null;
  let response: string | null = null;

  try {
    const res = await fetch(registration.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": event,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    statusCode = res.status;
    response = await res.text().catch(() => null);

    if (!res.ok) {
      throw new Error(`Webhook delivery failed: ${statusCode}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    response = errorMessage;

    await prisma.webhookDelivery.create({
      data: {
        registrationId,
        event,
        payload: payload as object,
        statusCode,
        response: errorMessage,
        attempts: job.attemptsMade + 1,
        lastAttemptAt: new Date(),
      },
    });

    throw err; // Let BullMQ retry
  }

  await prisma.webhookDelivery.create({
    data: {
      registrationId,
      event,
      payload: payload as object,
      statusCode,
      response,
      attempts: job.attemptsMade + 1,
      lastAttemptAt: new Date(),
      deliveredAt: new Date(),
    },
  });

  console.log(`Webhook delivered: ${event} → ${registration.url} (${statusCode})`);
  return { statusCode, url: registration.url };
}
