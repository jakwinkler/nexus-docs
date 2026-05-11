import { describe, it, expect } from "vitest";
import { canAccessDoc } from "../index";

describe("ACL product-based permission inheritance", () => {
  const gdprClient = { tier: "client" as const, extensions: ["nexus/gdpr-suite"] };
  const seoClient = { tier: "client" as const, extensions: ["nexus/seo-rich-snippets"] };
  const multiClient = {
    tier: "client" as const,
    extensions: ["nexus/gdpr-suite", "nexus/seo-rich-snippets"],
  };
  const noExtClient = { tier: "client" as const, extensions: [] };

  describe("product field grants access to all child pages", () => {
    it("client with nexus/gdpr-suite can access any client page with product: gdpr-suite", () => {
      expect(
        canAccessDoc(gdprClient, {
          access_tier: "client",
          extensions: [],
          product: "nexus/gdpr-suite",
        })
      ).toBe(true);
    });

    it("client with nexus/gdpr-suite can access GDPR config page (no explicit extensions)", () => {
      expect(
        canAccessDoc(gdprClient, {
          access_tier: "client",
          extensions: [],
          product: "nexus/gdpr-suite",
        })
      ).toBe(true);
    });

    it("client with nexus/gdpr-suite can access GDPR module pages", () => {
      // e.g. gdpr-suite/modules/gdpr-cookie.md has product: gdpr-suite, extensions: []
      expect(
        canAccessDoc(gdprClient, {
          access_tier: "client",
          extensions: [],
          product: "nexus/gdpr-suite",
        })
      ).toBe(true);
    });

    it("client with nexus/seo-rich-snippets CANNOT access GDPR pages", () => {
      expect(
        canAccessDoc(seoClient, {
          access_tier: "client",
          extensions: [],
          product: "nexus/gdpr-suite",
        })
      ).toBe(false);
    });

    it("client with multiple extensions can access pages for any owned product", () => {
      expect(
        canAccessDoc(multiClient, {
          access_tier: "client",
          extensions: [],
          product: "nexus/gdpr-suite",
        })
      ).toBe(true);

      expect(
        canAccessDoc(multiClient, {
          access_tier: "client",
          extensions: [],
          product: "nexus/seo-rich-snippets",
        })
      ).toBe(true);
    });

    it("client with no extensions cannot access product-gated pages", () => {
      expect(
        canAccessDoc(noExtClient, {
          access_tier: "client",
          extensions: [],
          product: "nexus/gdpr-suite",
        })
      ).toBe(false);
    });
  });

  describe("explicit extensions take precedence over product", () => {
    it("if doc has explicit extensions, those are checked instead of product", () => {
      expect(
        canAccessDoc(gdprClient, {
          access_tier: "client",
          extensions: ["nexus/gdpr-suite"],
          product: "nexus/gdpr-suite",
        })
      ).toBe(true);
    });

    it("explicit extensions can deny even if product would match", () => {
      // Doc requires seo-rich-snippets explicitly, even though product is gdpr-suite
      expect(
        canAccessDoc(gdprClient, {
          access_tier: "client",
          extensions: ["nexus/seo-rich-snippets"],
          product: "nexus/gdpr-suite",
        })
      ).toBe(false);
    });
  });

  describe("platform product is not gated", () => {
    it("client with no extensions can access platform pages", () => {
      expect(
        canAccessDoc(noExtClient, {
          access_tier: "client",
          extensions: [],
          product: "platform",
        })
      ).toBe(true);
    });

    it("any client can access pages with product: platform", () => {
      expect(
        canAccessDoc(gdprClient, {
          access_tier: "client",
          extensions: [],
          product: "platform",
        })
      ).toBe(true);
    });
  });

  describe("non-client tiers ignore product gating", () => {
    it("public content is always accessible regardless of product", () => {
      expect(
        canAccessDoc(null, {
          access_tier: "public",
          extensions: [],
          product: "nexus/gdpr-suite",
        })
      ).toBe(true);
    });

    it("admin can access any product", () => {
      expect(
        canAccessDoc(
          { tier: "admin", extensions: [] },
          { access_tier: "client", extensions: [], product: "nexus/gdpr-suite" }
        )
      ).toBe(true);
    });

    it("partner can access any client product", () => {
      expect(
        canAccessDoc(
          { tier: "partner", extensions: [] },
          { access_tier: "client", extensions: [], product: "nexus/gdpr-suite" }
        )
      ).toBe(true);
    });

    it("anonymous cannot access client product pages", () => {
      expect(
        canAccessDoc(null, {
          access_tier: "client",
          extensions: [],
          product: "nexus/gdpr-suite",
        })
      ).toBe(false);
    });
  });

  describe("real-world scenarios", () => {
    it("customer buys GDPR Suite → can see all GDPR docs but not SEO docs", () => {
      const customer = { tier: "client" as const, extensions: ["nexus/gdpr-suite"] };

      // GDPR pages they should see
      expect(canAccessDoc(customer, { access_tier: "client", extensions: [], product: "nexus/gdpr-suite" })).toBe(true);

      // SEO pages they should NOT see
      expect(canAccessDoc(customer, { access_tier: "client", extensions: [], product: "nexus/seo-rich-snippets" })).toBe(false);
      expect(canAccessDoc(customer, { access_tier: "client", extensions: [], product: "nexus/seo-pretty-filters" })).toBe(false);

      // Public pages they should always see
      expect(canAccessDoc(customer, { access_tier: "public", extensions: [], product: "nexus/seo-rich-snippets" })).toBe(true);
    });

    it("customer buys 3 extensions → can see docs for all 3", () => {
      const customer = {
        tier: "client" as const,
        extensions: [
          "nexus/gdpr-suite",
          "nexus/seo-rich-snippets",
          "nexus/store-pickup",
        ],
      };

      expect(canAccessDoc(customer, { access_tier: "client", extensions: [], product: "nexus/gdpr-suite" })).toBe(true);
      expect(canAccessDoc(customer, { access_tier: "client", extensions: [], product: "nexus/seo-rich-snippets" })).toBe(true);
      expect(canAccessDoc(customer, { access_tier: "client", extensions: [], product: "nexus/store-pickup" })).toBe(true);
      expect(canAccessDoc(customer, { access_tier: "client", extensions: [], product: "nexus/omnibus-directive" })).toBe(false);
    });
  });
});
