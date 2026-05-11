import { describe, it, expect } from "vitest";
import { canAccessDoc, getAccessFilter } from "../index";

describe("canAccessDoc", () => {
  // Public content
  it("allows anonymous users to access public content", () => {
    expect(canAccessDoc(null, { access_tier: "public", extensions: [] })).toBe(true);
  });

  it("allows any authenticated user to access public content", () => {
    expect(
      canAccessDoc(
        { tier: "client", extensions: [] },
        { access_tier: "public", extensions: [] }
      )
    ).toBe(true);
  });

  // Client content
  it("denies anonymous users access to client content", () => {
    expect(canAccessDoc(null, { access_tier: "client", extensions: [] })).toBe(false);
  });

  it("allows client with no extensions to access client content with empty extensions", () => {
    expect(
      canAccessDoc(
        { tier: "client", extensions: [] },
        { access_tier: "client", extensions: [] }
      )
    ).toBe(true);
  });

  it("allows client with matching extension to access gated content", () => {
    expect(
      canAccessDoc(
        { tier: "client", extensions: ["nexus/gdpr-suite"] },
        { access_tier: "client", extensions: ["nexus/gdpr-suite"] }
      )
    ).toBe(true);
  });

  it("denies client without matching extension to access gated content", () => {
    expect(
      canAccessDoc(
        { tier: "client", extensions: ["nexus/seo-rich-snippets"] },
        { access_tier: "client", extensions: ["nexus/gdpr-suite"] }
      )
    ).toBe(false);
  });

  it("allows client with one matching extension when doc requires multiple", () => {
    expect(
      canAccessDoc(
        { tier: "client", extensions: ["nexus/gdpr-suite"] },
        {
          access_tier: "client",
          extensions: ["nexus/gdpr-suite", "nexus/omnibus-directive"],
        }
      )
    ).toBe(true);
  });

  // Partner content
  it("denies anonymous users access to partner content", () => {
    expect(canAccessDoc(null, { access_tier: "partner", extensions: [] })).toBe(false);
  });

  it("denies client access to partner content", () => {
    expect(
      canAccessDoc(
        { tier: "client", extensions: [] },
        { access_tier: "partner", extensions: [] }
      )
    ).toBe(false);
  });

  it("allows partner access to partner content", () => {
    expect(
      canAccessDoc(
        { tier: "partner", extensions: [] },
        { access_tier: "partner", extensions: [] }
      )
    ).toBe(true);
  });

  it("allows partner access to client content (regardless of extensions)", () => {
    expect(
      canAccessDoc(
        { tier: "partner", extensions: [] },
        { access_tier: "client", extensions: ["nexus/gdpr-suite"] }
      )
    ).toBe(true);
  });

  // Admin content
  it("denies non-admin access to admin content", () => {
    expect(
      canAccessDoc(
        { tier: "partner", extensions: [] },
        { access_tier: "admin", extensions: [] }
      )
    ).toBe(false);
  });

  it("allows admin access to everything", () => {
    expect(
      canAccessDoc(
        { tier: "admin", extensions: [] },
        { access_tier: "admin", extensions: [] }
      )
    ).toBe(true);

    expect(
      canAccessDoc(
        { tier: "admin", extensions: [] },
        { access_tier: "partner", extensions: [] }
      )
    ).toBe(true);

    expect(
      canAccessDoc(
        { tier: "admin", extensions: [] },
        { access_tier: "client", extensions: ["nexus/gdpr-suite"] }
      )
    ).toBe(true);
  });
});

describe("getAccessFilter", () => {
  it("returns public-only filter for anonymous users", () => {
    const filter = getAccessFilter(null);
    expect(filter).toBe('access_tier = "public"');
  });

  it("returns empty filter for admin (sees everything)", () => {
    const filter = getAccessFilter({ tier: "admin", extensions: [] });
    expect(filter).toBe("");
  });

  it("returns public+client+partner filter for partner", () => {
    const filter = getAccessFilter({ tier: "partner", extensions: [] });
    expect(filter).toBe('access_tier IN ["public", "client", "partner"]');
  });

  it("returns client filter with extensions for client user", () => {
    const filter = getAccessFilter({
      tier: "client",
      extensions: ["nexus/gdpr-suite"],
    });
    expect(filter).toContain('"public"');
    expect(filter).toContain('"client"');
    expect(filter).toContain("nexus/gdpr-suite");
  });

  it("returns client filter without extensions for client with no permissions", () => {
    const filter = getAccessFilter({ tier: "client", extensions: [] });
    expect(filter).toContain('"public"');
    expect(filter).toContain('"client"');
  });

  it("returns public-only filter for public tier user", () => {
    const filter = getAccessFilter({ tier: "public", extensions: [] });
    expect(filter).toContain('"public"');
  });
});
