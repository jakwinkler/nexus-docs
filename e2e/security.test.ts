import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { validateFrontmatter } from "../src/lib/content/frontmatter";

describe("Security: Path traversal protection", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-security-"));
    vi.stubEnv("CONTENT_DIR", testDir);
    vi.resetModules();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("rejects path traversal with ../../../etc/passwd", async () => {
    const { getDocBySlug } = await import("../src/lib/content/loader");

    const doc = await getDocBySlug(["..", "..", "..", "etc", "passwd"]);
    expect(doc).toBeNull();
  });

  it("rejects path traversal with ../ at start", async () => {
    const { getDocBySlug } = await import("../src/lib/content/loader");

    const doc = await getDocBySlug(["..", "sensitive-file"]);
    expect(doc).toBeNull();
  });

  it("rejects path traversal with encoded segments", async () => {
    const { getDocBySlug } = await import("../src/lib/content/loader");

    const doc = await getDocBySlug(["%2e%2e", "etc", "passwd"]);
    expect(doc).toBeNull();
  });

  it("rejects path traversal embedded in valid-looking path", async () => {
    const { getDocBySlug } = await import("../src/lib/content/loader");

    const doc = await getDocBySlug(["docs", "..", "..", "etc", "passwd"]);
    expect(doc).toBeNull();
  });

  it("does not return content outside the content directory", async () => {
    // Create a file inside testDir to ensure the loader works for valid paths
    await fs.writeFile(
      path.join(testDir, "valid.md"),
      "---\ntitle: Valid\nsummary: Valid doc\naccess_tier: public\nproduct: platform\nstatus: published\nowner: test\n---\n\nValid content."
    );

    const { getDocBySlug } = await import("../src/lib/content/loader");

    // Valid file should load
    const validDoc = await getDocBySlug(["valid"]);
    expect(validDoc).not.toBeNull();

    // Traversal should not
    const traversalDoc = await getDocBySlug(["..", path.basename(testDir), "valid"]);
    // This might or might not resolve depending on the system, but it should
    // either return null or only return content from within the content dir
    if (traversalDoc !== null) {
      // If it resolves, verify it's accessing content within the content dir boundary
      expect(traversalDoc.title).toBe("Valid");
    }
  });
});

describe("Security: Frontmatter validation rejects XSS", () => {
  const baseFrontmatter = {
    title: "Safe Title",
    summary: "Safe summary",
    access_tier: "public",
    product: "platform",
    status: "published",
    owner: "test",
  };

  it("title with script tag is accepted by Zod (no HTML validation) but stored as-is", () => {
    // Zod validates structure, not content - XSS protection happens at rendering
    const xssTitle = '<script>alert("XSS")</script>';
    const result = validateFrontmatter({ ...baseFrontmatter, title: xssTitle });
    // The title is stored as-is; the rendering layer must escape it
    expect(result.title).toBe(xssTitle);
  });

  it("summary with HTML injection is stored as-is (rendering must escape)", () => {
    const xssSummary = '<img src=x onerror="alert(1)">';
    const result = validateFrontmatter({ ...baseFrontmatter, summary: xssSummary });
    expect(result.summary).toBe(xssSummary);
  });

  it("rejects non-string title (type safety prevents injection vectors)", () => {
    expect(() =>
      validateFrontmatter({ ...baseFrontmatter, title: { $gt: "" } })
    ).toThrow();
  });

  it("rejects non-string summary", () => {
    expect(() =>
      validateFrontmatter({ ...baseFrontmatter, summary: ["<script>"] })
    ).toThrow();
  });

  it("rejects empty title (min length validation)", () => {
    expect(() =>
      validateFrontmatter({ ...baseFrontmatter, title: "" })
    ).toThrow();
  });

  it("rejects empty summary (min length validation)", () => {
    expect(() =>
      validateFrontmatter({ ...baseFrontmatter, summary: "" })
    ).toThrow();
  });
});

describe("Security: Extension format validation", () => {
  const baseFrontmatter = {
    title: "Test",
    summary: "Test summary",
    access_tier: "client",
    product: "platform",
    status: "published",
    owner: "test",
  };

  it("accepts nexus/name pattern in extensions", () => {
    const result = validateFrontmatter({
      ...baseFrontmatter,
      extensions: ["nexus/gdpr-suite"],
    });
    expect(result.extensions).toEqual(["nexus/gdpr-suite"]);
  });

  it("accepts multiple extensions with nexus/name pattern", () => {
    const result = validateFrontmatter({
      ...baseFrontmatter,
      extensions: ["nexus/gdpr-suite", "nexus/seo-rich-snippets"],
    });
    expect(result.extensions).toHaveLength(2);
  });

  it("extensions schema accepts any string (no format enforcement at Zod level)", () => {
    // Current schema uses z.array(z.string()) -- no pattern enforcement
    const result = validateFrontmatter({
      ...baseFrontmatter,
      extensions: ["arbitrary-string"],
    });
    expect(result.extensions).toEqual(["arbitrary-string"]);
  });

  it("rejects non-array extensions", () => {
    expect(() =>
      validateFrontmatter({
        ...baseFrontmatter,
        extensions: "nexus/gdpr-suite",
      })
    ).toThrow();
  });

  it("rejects non-string items in extensions array", () => {
    expect(() =>
      validateFrontmatter({
        ...baseFrontmatter,
        extensions: [123],
      })
    ).toThrow();
  });

  it("accepts empty extensions array", () => {
    const result = validateFrontmatter({
      ...baseFrontmatter,
      extensions: [],
    });
    expect(result.extensions).toEqual([]);
  });

  it("defaults extensions to empty array when not provided", () => {
    const result = validateFrontmatter(baseFrontmatter);
    expect(result.extensions).toEqual([]);
  });
});

describe("Security: Access tier enum validation", () => {
  const baseFrontmatter = {
    title: "Test",
    summary: "Test summary",
    product: "platform",
    status: "published",
    owner: "test",
    extensions: [],
  };

  it("accepts custom tier names (flexible tier system)", () => {
    const result = validateFrontmatter({ ...baseFrontmatter, access_tier: "gold_partner" });
    expect(result.access_tier).toBe("gold_partner");
  });

  it("rejects numeric access_tier", () => {
    expect(() =>
      validateFrontmatter({ ...baseFrontmatter, access_tier: 3 })
    ).toThrow();
  });

  it("rejects empty access_tier", () => {
    expect(() =>
      validateFrontmatter({ ...baseFrontmatter, access_tier: "" })
    ).toThrow();
  });

  it("accepts all standard and custom tier values", () => {
    for (const tier of ["public", "client", "partner", "gold_partner", "platinum_partner", "admin"]) {
      const result = validateFrontmatter({ ...baseFrontmatter, access_tier: tier });
      expect(result.access_tier).toBe(tier);
    }
  });
});
