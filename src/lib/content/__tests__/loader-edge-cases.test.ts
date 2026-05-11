import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import path from "path";
import fs from "fs/promises";
import os from "os";

let testDir: string;

// We need a fresh loader for each test group because the module caches docCache.
// We use dynamic imports and reset modules between tests.

describe("Content Loader Edge Cases", () => {
  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-test-"));
    vi.stubEnv("CONTENT_DIR", testDir);
    vi.resetModules();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("returns empty array when content directory does not exist", async () => {
    vi.stubEnv("CONTENT_DIR", path.join(testDir, "nonexistent"));
    vi.resetModules();
    const { getAllDocs } = await import("../loader");

    const docs = await getAllDocs();
    expect(docs).toEqual([]);
  });

  it("skips files with invalid frontmatter and logs a warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Write a file with missing required fields
    await fs.writeFile(
      path.join(testDir, "bad-doc.md"),
      "---\ntitle: Only Title\n---\n\nContent without required fields."
    );

    const { getAllDocs, invalidateCache } = await import("../loader");
    invalidateCache();

    const docs = await getAllDocs();
    expect(docs).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("loads file with no content body (frontmatter only)", async () => {
    await fs.writeFile(
      path.join(testDir, "empty-body.md"),
      "---\ntitle: Empty Body\nsummary: A doc with no body\naccess_tier: public\nproduct: platform\nstatus: published\nowner: test\n---\n"
    );

    const { getDocBySlug, invalidateCache } = await import("../loader");
    invalidateCache();

    const doc = await getDocBySlug(["empty-body"]);
    expect(doc).not.toBeNull();
    expect(doc!.title).toBe("Empty Body");
    expect(doc!.content.trim()).toBe("");
  });

  it("loads deeply nested paths (3+ levels)", async () => {
    const deepDir = path.join(testDir, "level1", "level2", "level3");
    await fs.mkdir(deepDir, { recursive: true });

    await fs.writeFile(
      path.join(deepDir, "deep-doc.md"),
      "---\ntitle: Deep Doc\nsummary: Deeply nested\naccess_tier: public\nproduct: platform\nstatus: published\nowner: test\n---\n\nDeep content."
    );

    const { getDocBySlug, getAllDocs, invalidateCache } = await import("../loader");
    invalidateCache();

    const doc = await getDocBySlug(["level1", "level2", "level3", "deep-doc"]);
    expect(doc).not.toBeNull();
    expect(doc!.title).toBe("Deep Doc");
    expect(doc!.slug).toBe("level1/level2/level3/deep-doc");

    const all = await getAllDocs();
    expect(all.some((d) => d.slug === "level1/level2/level3/deep-doc")).toBe(true);
  });

  it("loads .mdx extension files", async () => {
    await fs.writeFile(
      path.join(testDir, "mdx-doc.mdx"),
      "---\ntitle: MDX Document\nsummary: An MDX file\naccess_tier: public\nproduct: platform\nstatus: published\nowner: test\n---\n\n<Component>MDX content</Component>"
    );

    const { getDocBySlug, getAllDocs, invalidateCache } = await import("../loader");
    invalidateCache();

    const doc = await getDocBySlug(["mdx-doc"]);
    expect(doc).not.toBeNull();
    expect(doc!.title).toBe("MDX Document");
    expect(doc!.slug).toBe("mdx-doc");

    const all = await getAllDocs();
    expect(all.some((d) => d.slug === "mdx-doc")).toBe(true);
  });

  it("resolves index.mdx for directory slugs", async () => {
    const subDir = path.join(testDir, "section");
    await fs.mkdir(subDir, { recursive: true });

    await fs.writeFile(
      path.join(subDir, "index.md"),
      "---\ntitle: Section Index\nsummary: Section landing\naccess_tier: public\nproduct: platform\nstatus: published\nowner: test\n---\n\nSection content."
    );

    const { getDocBySlug, invalidateCache } = await import("../loader");
    invalidateCache();

    const doc = await getDocBySlug(["section"]);
    expect(doc).not.toBeNull();
    expect(doc!.title).toBe("Section Index");
    expect(doc!.slug).toBe("section");
  });

  it("prefers .md over .mdx when both exist", async () => {
    await fs.writeFile(
      path.join(testDir, "dual.md"),
      "---\ntitle: MD Version\nsummary: The md file\naccess_tier: public\nproduct: platform\nstatus: published\nowner: test\n---\n\nMD content."
    );
    await fs.writeFile(
      path.join(testDir, "dual.mdx"),
      "---\ntitle: MDX Version\nsummary: The mdx file\naccess_tier: public\nproduct: platform\nstatus: published\nowner: test\n---\n\nMDX content."
    );

    const { getDocBySlug, invalidateCache } = await import("../loader");
    invalidateCache();

    const doc = await getDocBySlug(["dual"]);
    expect(doc).not.toBeNull();
    expect(doc!.title).toBe("MD Version"); // .md is checked first
  });

  it("returns null for path traversal attempts", async () => {
    const { getDocBySlug, invalidateCache } = await import("../loader");
    invalidateCache();

    // These should return null since no file matches
    const doc = await getDocBySlug(["..", "..", "etc", "passwd"]);
    expect(doc).toBeNull();
  });

  it("handles multiple docs in getAllDocs correctly", async () => {
    await fs.writeFile(
      path.join(testDir, "doc-a.md"),
      "---\ntitle: Doc A\nsummary: First doc\naccess_tier: public\nproduct: alpha\nstatus: published\nowner: test\n---\n\nA."
    );
    await fs.writeFile(
      path.join(testDir, "doc-b.md"),
      "---\ntitle: Doc B\nsummary: Second doc\naccess_tier: client\nproduct: beta\nstatus: published\nowner: test\n---\n\nB."
    );

    const { getAllDocs, invalidateCache } = await import("../loader");
    invalidateCache();

    const docs = await getAllDocs();
    expect(docs).toHaveLength(2);
    const slugs = docs.map((d) => d.slug).sort();
    expect(slugs).toEqual(["doc-a", "doc-b"]);
  });
});
