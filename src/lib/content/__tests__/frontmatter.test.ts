import { describe, it, expect } from "vitest";
import { validateFrontmatter } from "../frontmatter";

describe("validateFrontmatter", () => {
  const validFrontmatter = {
    title: "Test Page",
    summary: "A test page for validation",
    access_tier: "public",
    product: "gdpr-suite",
    status: "published",
    owner: "jakub",
  };

  it("validates valid frontmatter with required fields only", () => {
    const result = validateFrontmatter(validFrontmatter);
    expect(result.title).toBe("Test Page");
    expect(result.summary).toBe("A test page for validation");
    expect(result.access_tier).toBe("public");
    expect(result.product).toBe("gdpr-suite");
    expect(result.status).toBe("published");
    expect(result.owner).toBe("jakub");
  });

  it("applies defaults for optional fields", () => {
    const result = validateFrontmatter(validFrontmatter);
    expect(result.extensions).toEqual([]);
    expect(result.version).toBe("*");
    expect(result.tags).toEqual([]);
    expect(result.changelog).toBe(false);
    expect(result.review_interval_days).toBe(90);
    expect(result.deprecated).toBe(false);
    expect(result.redirect_from).toEqual([]);
    expect(result.related).toEqual([]);
    expect(result.nav_order).toBe(0);
    expect(result.nav_hidden).toBe(false);
  });

  it("validates full frontmatter with all fields", () => {
    const full = {
      ...validFrontmatter,
      extensions: ["nexus/gdpr-suite"],
      version: "2.x",
      tags: ["gdpr", "compliance"],
      video: "https://youtube.com/watch?v=abc123",
      changelog: true,
      last_verified_at: "2026-03-15",
      review_interval_days: 60,
      deprecated: false,
      redirect_from: ["/old-path"],
      related: ["/other-page"],
      nav_order: 3,
      nav_hidden: false,
    };

    const result = validateFrontmatter(full);
    expect(result.extensions).toEqual(["nexus/gdpr-suite"]);
    expect(result.version).toBe("2.x");
    expect(result.tags).toEqual(["gdpr", "compliance"]);
    expect(result.video).toBe("https://youtube.com/watch?v=abc123");
    expect(result.nav_order).toBe(3);
  });

  it("throws on missing required field: title", () => {
    const { title, ...missing } = validFrontmatter;
    void title;
    expect(() => validateFrontmatter(missing)).toThrow();
  });

  it("throws on missing required field: summary", () => {
    const { summary, ...missing } = validFrontmatter;
    void summary;
    expect(() => validateFrontmatter(missing)).toThrow();
  });

  it("throws on missing required field: access_tier", () => {
    const { access_tier, ...missing } = validFrontmatter;
    void access_tier;
    expect(() => validateFrontmatter(missing)).toThrow();
  });

  it("accepts any string as access_tier (flexible tiers)", () => {
    const result = validateFrontmatter({ ...validFrontmatter, access_tier: "gold_partner" });
    expect(result.access_tier).toBe("gold_partner");
  });

  it("throws on empty access_tier", () => {
    expect(() =>
      validateFrontmatter({ ...validFrontmatter, access_tier: "" })
    ).toThrow();
  });

  it("throws on invalid status enum value", () => {
    expect(() =>
      validateFrontmatter({ ...validFrontmatter, status: "archived" })
    ).toThrow();
  });

  it("throws on empty title", () => {
    expect(() =>
      validateFrontmatter({ ...validFrontmatter, title: "" })
    ).toThrow();
  });

  it("accepts all tier values including custom ones", () => {
    for (const tier of ["public", "client", "partner", "gold_partner", "platinum_partner", "admin"]) {
      const result = validateFrontmatter({ ...validFrontmatter, access_tier: tier });
      expect(result.access_tier).toBe(tier);
    }
  });

  it("accepts all valid status values", () => {
    for (const status of ["draft", "published", "deprecated"]) {
      const result = validateFrontmatter({ ...validFrontmatter, status });
      expect(result.status).toBe(status);
    }
  });
});
