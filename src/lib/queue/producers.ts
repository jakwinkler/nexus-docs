import {
  getContentSyncQueue,
  getReindexQueue,
  getEmailQueue,
  getWebhookQueue,
} from "./queues";

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
