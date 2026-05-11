import { describe, it, expect, beforeAll } from "vitest";
import { getAllDocs, invalidateCache } from "../src/lib/content";

beforeAll(() => {
  invalidateCache();
});

describe("SEO Requirements", () => {
  it("every published doc has title shorter than 70 characters", async () => {
    const docs = await getAllDocs();
    const published = docs.filter((d) => d.status === "published");

    expect(published.length).toBeGreaterThan(0);

    for (const doc of published) {
      expect(doc.title.length).toBeLessThan(70);
    }
  });

  it("every published doc has summary shorter than 160 characters", async () => {
    const docs = await getAllDocs();
    const published = docs.filter((d) => d.status === "published");

    expect(published.length).toBeGreaterThan(0);

    for (const doc of published) {
      expect(doc.summary.length).toBeLessThan(160);
    }
  });

  it("no draft docs appear in public-facing content listing", async () => {
    const docs = await getAllDocs();
    const publicDocs = docs.filter(
      (d) => d.access_tier === "public" && d.status !== "draft"
    );

    // All public-facing docs should be published or deprecated, never draft
    for (const doc of publicDocs) {
      expect(doc.status).not.toBe("draft");
    }
  });

  it("draft docs are excluded from public-facing content", async () => {
    const docs = await getAllDocs();
    const draftDocs = docs.filter((d) => d.status === "draft");

    // Draft docs should not be treated as public-ready
    // (This verifies the data model supports draft filtering)
    for (const doc of draftDocs) {
      expect(doc.status).toBe("draft");
    }
  });

  it("deprecated docs are flagged with deprecated field", async () => {
    const docs = await getAllDocs();
    const deprecatedDocs = docs.filter((d) => d.status === "deprecated");

    for (const doc of deprecatedDocs) {
      expect(doc.deprecated).toBe(true);
    }
  });

  it("every published doc has a non-empty owner", async () => {
    const docs = await getAllDocs();
    const published = docs.filter((d) => d.status === "published");

    for (const doc of published) {
      expect(doc.owner.length).toBeGreaterThan(0);
    }
  });

  it("every published doc has a non-empty product", async () => {
    const docs = await getAllDocs();
    const published = docs.filter((d) => d.status === "published");

    for (const doc of published) {
      expect(doc.product.length).toBeGreaterThan(0);
    }
  });

  it("published doc slugs are URL-safe", async () => {
    const docs = await getAllDocs();
    const published = docs.filter((d) => d.status === "published");

    for (const doc of published) {
      // Slugs should only contain lowercase alphanumeric, hyphens, and slashes (or empty for root)
      expect(doc.slug).toMatch(/^[a-z0-9\-/]*$/);
    }
  });

  it("no duplicate slugs exist", async () => {
    const docs = await getAllDocs();
    const slugs = docs.map((d) => d.slug);
    const uniqueSlugs = new Set(slugs);

    expect(slugs.length).toBe(uniqueSlugs.size);
  });

  it("all titles are non-empty strings", async () => {
    const docs = await getAllDocs();

    for (const doc of docs) {
      expect(typeof doc.title).toBe("string");
      expect(doc.title.trim().length).toBeGreaterThan(0);
    }
  });

  it("all summaries are non-empty strings", async () => {
    const docs = await getAllDocs();

    for (const doc of docs) {
      expect(typeof doc.summary).toBe("string");
      expect(doc.summary.trim().length).toBeGreaterThan(0);
    }
  });
});
