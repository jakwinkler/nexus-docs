import { createHmac, timingSafeEqual } from "node:crypto";
import { SIGNATURE_DRIFT_SECONDS } from "./types";

export type VerifyResult =
  | { ok: true }
  | { ok: false; status: 401; code: "invalid_signature" }
  | { ok: false; status: 401; code: "missing_header" }
  | { ok: false; status: 408; code: "stale_timestamp" };

/**
 * Verify an incoming Magento webhook against the shared HMAC secret.
 *
 * The signing input is `{timestamp}.{raw body bytes}` — the body must be
 * the unparsed request bytes, NOT a re-serialized JSON. The handler that
 * calls this must read the body via `request.text()` and pass the exact
 * string through.
 */
export function verifyMagentoWebhook(args: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  now?: () => number;
}): VerifyResult {
  const { rawBody, timestamp, signature, secret } = args;
  const now = args.now ?? (() => Math.floor(Date.now() / 1000));

  if (!timestamp || !signature) {
    return { ok: false, status: 401, code: "missing_header" };
  }

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) {
    return { ok: false, status: 401, code: "missing_header" };
  }

  // Replay protection: reject anything outside the drift window.
  if (Math.abs(now() - ts) > SIGNATURE_DRIFT_SECONDS) {
    return { ok: false, status: 408, code: "stale_timestamp" };
  }

  const expectedDigest = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const expected = `sha256=${expectedDigest}`;

  // Constant-time compare — both buffers must be the same length first
  // otherwise timingSafeEqual throws.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, code: "invalid_signature" };
  }

  return { ok: true };
}
