import { describe, it, expect, beforeEach, vi } from "vitest";
import path from "path";

// Set CONTENT_DIR before importing loader
const testContentDir = path.join(__dirname, "../../../../content");
vi.stubEnv("CONTENT_DIR", testContentDir);

import {
  getDocBySlug,
  getAllDocs,
  getDocsByProduct,
  invalidateCache,
  getContentDir,
} from "../loader";

// These tests run against the starter content shipped with the OSS repo
// (content/index.md, getting-started.md, content-model.md, example-gated.md).
// If you've replaced the content directory, update the slugs / counts below.

describe("getContentDir", () => {
  it("returns CONTENT_DIR env var when set", () => {
    expect(getContentDir()).toBe(testContentDir);
  });
});

describe("getDocBySlug", () => {
  beforeEach(() => {
    invalidateCache();
  });

  it("loads a doc by slug parts", async () => {
    const doc = await getDocBySlug(["getting-started"]);
    expect(doc).not.toBeNull();
    expect(doc!.title).toBe("Getting Started");
    expect(doc!.access_tier).toBe("public");
    expect(doc!.slug).toBe("getting-started");
  });

  it("returns null for non-existent slug", async () => {
    const doc = await getDocBySlug(["non", "existent", "page"]);
    expect(doc).toBeNull();
  });

  it("loads client-tier doc", async () => {
    const doc = await getDocBySlug(["example-gated"]);
    expect(doc).not.toBeNull();
    expect(doc!.access_tier).toBe("client");
  });

  it("returns content body", async () => {
    const doc = await getDocBySlug(["getting-started"]);
    expect(doc!.content).toContain("Getting Started");
    expect(doc!.content.length).toBeGreaterThan(0);
  });

  it("includes lastModified as ISO string", async () => {
    const doc = await getDocBySlug(["getting-started"]);
    expect(doc!.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("getAllDocs", () => {
  beforeEach(() => {
    invalidateCache();
  });

  it("returns all markdown docs", async () => {
    const docs = await getAllDocs();
    expect(docs.length).toBeGreaterThanOrEqual(3);
  });

  it("returns docs with valid frontmatter", async () => {
    const docs = await getAllDocs();
    for (const doc of docs) {
      expect(doc.title).toBeTruthy();
      expect(doc.summary).toBeTruthy();
      expect(doc.access_tier).toBeTruthy();
      expect(doc.product).toBeTruthy();
      expect(doc.status).toBeTruthy();
      expect(doc.owner).toBeTruthy();
    }
  });

  it("caches results on second call", async () => {
    const first = await getAllDocs();
    const second = await getAllDocs();
    expect(first).toStrictEqual(second);
  });

  it("invalidates cache correctly", async () => {
    const first = await getAllDocs();
    invalidateCache();
    const second = await getAllDocs();
    expect(first).not.toBe(second);
    expect(first.length).toBe(second.length);
  });
});

describe("getDocsByProduct", () => {
  beforeEach(() => {
    invalidateCache();
  });

  it("filters docs by product", async () => {
    const docs = await getDocsByProduct("platform");
    expect(docs.length).toBeGreaterThan(0);
    for (const doc of docs) {
      expect(doc.product).toBe("platform");
    }
  });

  it("returns empty array for unknown product", async () => {
    const docs = await getDocsByProduct("unknown-product-xyz");
    expect(docs).toEqual([]);
  });
});
