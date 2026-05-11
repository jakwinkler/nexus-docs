import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyMagentoWebhook } from "../verify";

const SECRET = "test-secret-do-not-use-in-prod";

function sign(timestamp: string, body: string, secret = SECRET): string {
  return (
    "sha256=" +
    createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
  );
}

describe("verifyMagentoWebhook", () => {
  const body = '{"event":"license.granted","event_id":"x"}';
  const now = () => 1_700_000_000;
  const tsNow = "1700000000";

  it("accepts a correctly signed request", () => {
    const result = verifyMagentoWebhook({
      rawBody: body,
      timestamp: tsNow,
      signature: sign(tsNow, body),
      secret: SECRET,
      now,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects mismatched signatures", () => {
    const result = verifyMagentoWebhook({
      rawBody: body,
      timestamp: tsNow,
      signature: sign(tsNow, body, "wrong-secret"),
      secret: SECRET,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_signature");
  });

  it("rejects when the body is tampered with", () => {
    const tampered = body.replace("license.granted", "license.revoked");
    const result = verifyMagentoWebhook({
      rawBody: tampered,
      timestamp: tsNow,
      signature: sign(tsNow, body), // signed the ORIGINAL
      secret: SECRET,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_signature");
  });

  it("rejects timestamps older than 5 minutes", () => {
    const oldTs = String(1_700_000_000 - 301);
    const result = verifyMagentoWebhook({
      rawBody: body,
      timestamp: oldTs,
      signature: sign(oldTs, body),
      secret: SECRET,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("stale_timestamp");
  });

  it("rejects timestamps further than 5 minutes in the future", () => {
    const futureTs = String(1_700_000_000 + 301);
    const result = verifyMagentoWebhook({
      rawBody: body,
      timestamp: futureTs,
      signature: sign(futureTs, body),
      secret: SECRET,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("stale_timestamp");
  });

  it("accepts timestamps exactly at the 5-minute boundary", () => {
    const edgeTs = String(1_700_000_000 - 300);
    const result = verifyMagentoWebhook({
      rawBody: body,
      timestamp: edgeTs,
      signature: sign(edgeTs, body),
      secret: SECRET,
      now,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects requests missing the timestamp header", () => {
    const result = verifyMagentoWebhook({
      rawBody: body,
      timestamp: null,
      signature: sign(tsNow, body),
      secret: SECRET,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("missing_header");
  });

  it("rejects requests missing the signature header", () => {
    const result = verifyMagentoWebhook({
      rawBody: body,
      timestamp: tsNow,
      signature: null,
      secret: SECRET,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("missing_header");
  });

  it("rejects non-numeric timestamps", () => {
    const result = verifyMagentoWebhook({
      rawBody: body,
      timestamp: "not-a-number",
      signature: sign(tsNow, body),
      secret: SECRET,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("missing_header");
  });

  it("rejects signatures of the wrong length without throwing", () => {
    // timingSafeEqual throws if lengths differ — we must handle this.
    const result = verifyMagentoWebhook({
      rawBody: body,
      timestamp: tsNow,
      signature: "sha256=short",
      secret: SECRET,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_signature");
  });

  it("treats the raw body literally — no JSON normalization", () => {
    // Two equivalent JSONs with different whitespace produce different signatures.
    const compact = '{"a":1,"b":2}';
    const padded = '{ "a": 1, "b": 2 }';
    const sigForCompact = sign(tsNow, compact);
    const result = verifyMagentoWebhook({
      rawBody: padded,
      timestamp: tsNow,
      signature: sigForCompact,
      secret: SECRET,
      now,
    });
    expect(result.ok).toBe(false);
  });
});
