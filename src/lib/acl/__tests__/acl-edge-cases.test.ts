import { describe, it, expect } from "vitest";
import { canAccessDoc, getAccessFilter, getUserACLContext } from "../index";

describe("canAccessDoc edge cases", () => {
  it("client with multiple extensions matching multiple doc extensions", () => {
    const user = { tier: "client", extensions: ["nexus/gdpr-suite", "nexus/seo-rich-snippets", "nexus/omnibus-directive"] };
    const doc = { access_tier: "client", extensions: ["nexus/gdpr-suite", "nexus/omnibus-directive"] };
    expect(canAccessDoc(user, doc)).toBe(true);
  });

  it("client with multiple extensions but none matching doc extensions", () => {
    const user = { tier: "client", extensions: ["nexus/analytics", "nexus/crm"] };
    const doc = { access_tier: "client", extensions: ["nexus/gdpr-suite", "nexus/omnibus-directive"] };
    expect(canAccessDoc(user, doc)).toBe(false);
  });

  it("unknown tier value resolves to rank 0", () => {
    const user = { tier: "unknown", extensions: [] };
    expect(canAccessDoc(user, { access_tier: "public", extensions: [] })).toBe(true);
    expect(canAccessDoc(user, { access_tier: "client", extensions: [] })).toBe(false);
  });

  it("empty string tier resolves to rank 0", () => {
    const user = { tier: "", extensions: [] };
    expect(canAccessDoc(user, { access_tier: "public", extensions: [] })).toBe(true);
    expect(canAccessDoc(user, { access_tier: "client", extensions: [] })).toBe(false);
  });

  it("unknown doc access_tier fails closed (denies access)", () => {
    // Typos in frontmatter must NEVER expose docs. Fail closed.
    const user = { tier: "client", extensions: [] };
    expect(canAccessDoc(user, { access_tier: "unknown", extensions: [] })).toBe(false);
  });

  it("partner cannot access content with unknown tier (fail closed)", () => {
    const user = { tier: "partner", extensions: [] };
    expect(canAccessDoc(user, { access_tier: "custom", extensions: [] })).toBe(false);
  });

  it("client with extensions accessing doc with empty extensions list", () => {
    const user = { tier: "client", extensions: ["nexus/gdpr-suite"] };
    expect(canAccessDoc(user, { access_tier: "client", extensions: [] })).toBe(true);
  });

  it("client with empty extensions accessing doc with extension requirements", () => {
    const user = { tier: "client", extensions: [] };
    expect(canAccessDoc(user, { access_tier: "client", extensions: ["nexus/gdpr-suite"] })).toBe(false);
  });

  it("admin bypasses extension gating", () => {
    const user = { tier: "admin", extensions: [] };
    expect(canAccessDoc(user, { access_tier: "client", extensions: ["nexus/gdpr-suite"] })).toBe(true);
  });

  it("gold_partner can access partner content", () => {
    const user = { tier: "gold_partner", extensions: [] };
    expect(canAccessDoc(user, { access_tier: "partner", extensions: [] })).toBe(true);
  });

  it("partner cannot access gold_partner content", () => {
    const user = { tier: "partner", extensions: [] };
    expect(canAccessDoc(user, { access_tier: "gold_partner", extensions: [] })).toBe(false);
  });

  it("platinum_partner can access gold_partner content", () => {
    const user = { tier: "platinum_partner", extensions: [] };
    expect(canAccessDoc(user, { access_tier: "gold_partner", extensions: [] })).toBe(true);
  });
});

describe("getAccessFilter edge cases", () => {
  it("client with multiple extensions includes all in filter", () => {
    const filter = getAccessFilter({ tier: "client", extensions: ["nexus/gdpr-suite", "nexus/seo-rich-snippets"] });
    expect(filter).toContain('"nexus/gdpr-suite"');
    expect(filter).toContain('"nexus/seo-rich-snippets"');
  });

  it("unknown tier returns public-only filter (fallback)", () => {
    const filter = getAccessFilter({ tier: "unknown", extensions: [] });
    expect(filter).toContain('"public"');
  });

  it("empty string tier returns public-only filter", () => {
    const filter = getAccessFilter({ tier: "", extensions: [] });
    expect(filter).toContain('"public"');
  });

  it("partner filter includes public, client, partner but not admin", () => {
    const filter = getAccessFilter({ tier: "partner", extensions: [] });
    expect(filter).toContain('"public"');
    expect(filter).toContain('"client"');
    expect(filter).toContain('"partner"');
    expect(filter).not.toContain('"admin"');
    expect(filter).not.toContain('"gold_partner"');
  });

  it("admin filter is empty (no restrictions)", () => {
    const filter = getAccessFilter({ tier: "admin", extensions: ["nexus/anything"] });
    expect(filter).toBe("");
  });

  it("gold_partner filter includes partner tier", () => {
    const filter = getAccessFilter({ tier: "gold_partner", extensions: [] });
    expect(filter).toContain('"partner"');
    expect(filter).toContain('"gold_partner"');
    expect(filter).not.toContain('"platinum_partner"');
  });
});

describe("getUserACLContext", () => {
  it("creates context with resolved tierRank", () => {
    const ctx = getUserACLContext("client", ["nexus/gdpr-suite"]);
    expect(ctx.tier).toBe("client");
    expect(ctx.tierRank).toBe(10);
    expect(ctx.extensions).toEqual(["nexus/gdpr-suite"]);
  });

  it("creates context with empty extensions", () => {
    const ctx = getUserACLContext("partner", []);
    expect(ctx.tier).toBe("partner");
    expect(ctx.tierRank).toBe(20);
  });

  it("creates admin context with rank 100", () => {
    const ctx = getUserACLContext("admin", []);
    expect(ctx.tierRank).toBe(100);
  });

  it("unknown tier resolves to rank 0", () => {
    const ctx = getUserACLContext("nonexistent", []);
    expect(ctx.tierRank).toBe(0);
  });

  it("gold_partner has rank 30", () => {
    const ctx = getUserACLContext("gold_partner", []);
    expect(ctx.tierRank).toBe(30);
  });
});
