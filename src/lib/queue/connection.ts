import type { ConnectionOptions } from "bullmq";

/**
 * Parse REDIS_URL into a BullMQ ConnectionOptions object that preserves
 * username, password, database number, and TLS — not just host/port.
 *
 * Examples:
 *   redis://localhost:6379                          → host+port
 *   redis://:secret@redis.internal:6379/2           → +password +db
 *   redis://default:secret@redis.upstash.io:6379    → +username +password
 *   rediss://user:pass@host:6380/0                  → +TLS
 */
function buildConnection(): ConnectionOptions {
  const raw = process.env.REDIS_URL || "redis://localhost:6379";
  const url = new URL(raw);

  const conn: Record<string, unknown> = {
    host: url.hostname,
    port: parseInt(url.port || "6379", 10),
  };

  if (url.username) conn.username = decodeURIComponent(url.username);
  if (url.password) conn.password = decodeURIComponent(url.password);

  // pathname is "/<db>" when present
  const dbPath = url.pathname.replace(/^\//, "");
  if (dbPath) {
    const db = parseInt(dbPath, 10);
    if (Number.isFinite(db)) conn.db = db;
  }

  // rediss:// → TLS
  if (url.protocol === "rediss:") conn.tls = {};

  return conn as ConnectionOptions;
}

export const redisConnection: ConnectionOptions = buildConnection();
