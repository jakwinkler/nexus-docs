import { Worker } from "bullmq";
import { redisConnection as connection } from "../src/lib/queue/connection";
import { processContentSync } from "./jobs/content-sync";
import { processReindex } from "./jobs/reindex";
import { processEmail } from "./jobs/email-notify";
import { processWebhookDeliver } from "./jobs/webhook-deliver";
import { processAclSync } from "./jobs/acl-sync";

console.log("Starting Nexus worker...");

const contentSyncWorker = new Worker("content-sync", processContentSync, {
  connection,
  concurrency: 1,
});

const reindexWorker = new Worker("reindex", processReindex, {
  connection,
  concurrency: 1,
});

const emailWorker = new Worker("email", processEmail, {
  connection,
  concurrency: 5,
});

const webhookWorker = new Worker("webhook", processWebhookDeliver, {
  connection,
  concurrency: 3,
});

// concurrency: 1 — events for the same user can arrive in close succession
// (partner.flag_changed + license.granted), and serialising avoids row-level
// write races on the User row.
const aclSyncWorker = new Worker("acl-sync", processAclSync, {
  connection,
  concurrency: 1,
});

const workers = [
  contentSyncWorker,
  reindexWorker,
  emailWorker,
  webhookWorker,
  aclSyncWorker,
];

for (const worker of workers) {
  worker.on("completed", (job) => {
    console.log(`[${worker.name}] Job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[${worker.name}] Job ${job?.id} failed:`, err.message);
  });
}

async function shutdown() {
  console.log("Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("Worker started. Listening for jobs...");
