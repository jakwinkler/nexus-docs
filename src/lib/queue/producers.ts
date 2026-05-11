import {
  getContentSyncQueue,
  getReindexQueue,
  getEmailQueue,
  getWebhookQueue,
  getAclSyncQueue,
} from "./queues";
import type { MagentoEvent } from "@/lib/magento/types";

export async function enqueueContentSync(
  options?: { fullSync?: boolean }
): Promise<void> {
  await getContentSyncQueue().add("sync", { fullSync: options?.fullSync ?? true });
}

export async function enqueueReindex(
  options?: { slugs?: string[] }
): Promise<void> {
  await getReindexQueue().add("reindex", { slugs: options?.slugs });
}

export async function enqueueEmail(
  to: string,
  template: string,
  data: Record<string, unknown>
): Promise<void> {
  await getEmailQueue().add("send", { to, template, data });
}

export async function enqueueWebhookDeliver(
  registrationId: string,
  event: string,
  payload: unknown
): Promise<void> {
  await getWebhookQueue().add("deliver", { registrationId, event, payload });
}

export interface AclSyncJobData {
  source: "magento";
  event: MagentoEvent;
  eventId: string;
  /** The full envelope payload as received. Worker re-validates per event type. */
  envelope: unknown;
}

export async function enqueueAclSync(data: AclSyncJobData): Promise<void> {
  // Use eventId as the BullMQ job ID for an extra layer of dedup — if the
  // same event_id was already enqueued and is in-flight or recently
  // completed, BullMQ silently drops the duplicate add().
  await getAclSyncQueue().add(data.event, data, { jobId: data.eventId });
}
