import type { Job } from "bullmq";
import { Queue } from "bullmq";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { redisConnection as connection } from "../../src/lib/queue/connection";
import { walkDir } from "../../src/lib/content/utils";

const prisma = new PrismaClient();

interface ContentSyncData {
  fullSync: boolean;
}

async function getFileHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, "utf-8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export async function processContentSync(job: Job<ContentSyncData>) {
  const contentDir = process.env.CONTENT_DIR || path.join(process.cwd(), "content");
  console.log(`Content sync: scanning ${contentDir}`);

  const files = await walkDir(contentDir);

  // Hash all files in parallel (capped concurrency to avoid file-handle storms).
  const fileHashes = await mapWithConcurrency(files, 16, async (filePath) => ({
    relative: path.relative(contentDir, filePath),
    hash: await getFileHash(filePath),
  }));

  // Single grouped query to fetch the latest gitSha per filePath.
  const latest = await prisma.contentRevision.findMany({
    where: { filePath: { in: fileHashes.map((f) => f.relative) } },
    orderBy: { createdAt: "desc" },
    select: { filePath: true, gitSha: true },
  });
  const latestByPath = new Map<string, string>();
  for (const row of latest) {
    if (!latestByPath.has(row.filePath)) latestByPath.set(row.filePath, row.gitSha);
  }

  // Build the diff in memory, then bulk-insert.
  const newRevisions = fileHashes
    .filter(({ relative, hash }) => latestByPath.get(relative) !== hash)
    .map(({ relative, hash }) => ({
      filePath: relative,
      gitSha: hash,
      author: "system",
      message: latestByPath.has(relative) ? "Content updated" : "Initial sync",
    }));

  let changed = 0;
  if (newRevisions.length > 0) {
    const result = await prisma.contentRevision.createMany({ data: newRevisions });
    changed = result.count;
  }

  console.log(`Content sync complete: ${files.length} files, ${changed} changed`);

  // Invalidate the app's content cache so it picks up changes
  const appUrl = process.env.NEXTAUTH_URL || "http://app:3000";
  const webhookSecret = process.env.WEBHOOK_SECRET || "";
  try {
    await fetch(`${appUrl}/api/cache/invalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${webhookSecret}` },
    });
    console.log("App cache invalidated.");
  } catch (err) {
    console.warn("Failed to invalidate app cache:", err);
  }

  // Chain reindex if any files changed
  if (changed > 0) {
    console.log("Changes detected — enqueuing reindex...");
    const reindexQueue = new Queue("reindex", { connection });
    await reindexQueue.add("reindex", { slugs: undefined });
    await reindexQueue.close();
  }

  job.updateProgress(100);
  return { total: files.length, changed };
}
