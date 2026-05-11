import { Queue } from "bullmq";
import { redisConnection } from "./connection";

let _contentSyncQueue: Queue | null = null;
let _reindexQueue: Queue | null = null;
let _emailQueue: Queue | null = null;
let _webhookQueue: Queue | null = null;
let _aclSyncQueue: Queue | null = null;

export function getContentSyncQueue(): Queue {
  if (!_contentSyncQueue) {
    _contentSyncQueue = new Queue("content-sync", {
      connection: redisConnection,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    });
  }
  return _contentSyncQueue;
}

export function getReindexQueue(): Queue {
  if (!_reindexQueue) {
    _reindexQueue = new Queue("reindex", {
      connection: redisConnection,
      defaultJobOptions: { attempts: 2, backoff: { type: "exponential", delay: 3000 } },
    });
  }
  return _reindexQueue;
}

export function getEmailQueue(): Queue {
  if (!_emailQueue) {
    _emailQueue = new Queue("email", {
      connection: redisConnection,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 10000 } },
    });
  }
  return _emailQueue;
}

export function getWebhookQueue(): Queue {
  if (!_webhookQueue) {
    _webhookQueue = new Queue("webhook", {
      connection: redisConnection,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    });
  }
  return _webhookQueue;
}

export function getAclSyncQueue(): Queue {
  if (!_aclSyncQueue) {
    _aclSyncQueue = new Queue("acl-sync", {
      connection: redisConnection,
      // 4 attempts with backoff covers transient DB hiccups during the
      // user upsert. Magento itself retries up to 5 times for 5xx, so the
      // outer retry budget is roughly 4 × 5 = 20 attempts before manual
      // intervention is needed.
      defaultJobOptions: { attempts: 4, backoff: { type: "exponential", delay: 5000 } },
    });
  }
  return _aclSyncQueue;
}
