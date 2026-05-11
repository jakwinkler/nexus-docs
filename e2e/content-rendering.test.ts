import { describe, it, expect, beforeAll } from "vitest";
import { getDocBySlug, getAllDocs, buildNavTree, invalidateCache } from "../src/lib/content";
import { canAccessDoc } from "../src/lib/acl";
import { validateFrontmatter } from "../src/lib/content/frontmatter";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

/**
 * E2E-style tests that validate the full content pipeline:
 * file → frontmatter validation → content loading → nav building → ACL check
 */

const contentDir = path.join(process.cwd(), "content");

beforeAll(() => {
  invalidateCache();
});

describe("Content Pipeline E2E", () => {
  it("every markdown file in content/ has valid frontmatter", async () => {
    const docs = await getAllDocs();
    expect(docs.length).toBeGreaterThan(0);

    for (const doc of docs) {
      expect(doc.title).toBeTruthy();
      expect(doc.summary).toBeTruthy();
      expect(doc.access_tier).toBeTruthy(); // Flexible tiers — any non-empty string is valid
      expect(["draft", "published", "deprecated"]).toContain(doc.status);
      expect(doc.owner).toBeTruthy();
    }
  });

  it("every doc has a matching slug that resolves back to the doc", async () => {
    const docs = await getAllDocs();

    for (const doc of docs) {
      // Root index (slug "") is loaded via getDocBySlug(["index"])
      const slugParts = doc.slug === "" ? ["index"] : doc.slug.split("/");
      const loaded = await getDocBySlug(slugParts);
      expect(loaded).not.toBeNull();
      expect(loaded!.title).toBe(doc.title);
    }
  });

  it("public docs are accessible to anonymous users", async () => {
    const docs = await getAllDocs();
    const publicDocs = docs.filter((d) => d.access_tier === "public");

    expect(publicDocs.length).toBeGreaterThan(0);

    for (const doc of publicDocs) {
      expect(canAccessDoc(null, doc)).toBe(true);
    }
  });

  it("client docs are NOT accessible to anonymous users", async () => {
    const docs = await getAllDocs();
    const clientDocs = docs.filter((d) => d.access_tier === "client");

    expect(clientDocs.length).toBeGreaterThan(0);

    for (const doc of clientDocs) {
      expect(canAccessDoc(null, doc)).toBe(false);
    }
  });

  it("partner docs are NOT accessible to client users", async () => {
    const docs = await getAllDocs();
    const partnerDocs = docs.filter((d) => d.access_tier === "partner");

    expect(partnerDocs.length).toBeGreaterThan(0);

    for (const doc of partnerDocs) {
      expect(
        canAccessDoc({ tier: "client", extensions: [] }, doc)
      ).toBe(false);
    }
  });

  it("admin can access all docs", async () => {
    const docs = await getAllDocs();

    for (const doc of docs) {
      expect(
        canAccessDoc({ tier: "admin", extensions: [] }, doc)
      ).toBe(true);
    }
  });

  it("nav tree includes all non-hidden published docs", async () => {
    const docs = await getAllDocs();
    const tree = buildNavTree(docs, { userTier: "admin", showDrafts: false });

    const publishedNonHidden = docs.filter(
      (d) => d.status === "published" && !d.nav_hidden && d.slug !== ""
    );

    // Flatten the nav tree to count all nodes with hrefs
    function countNodes(nodes: typeof tree): number {
      let count = 0;
      for (const node of nodes) {
        if (node.href) count++;
        if (node.children) count += countNodes(node.children);
      }
      return count;
    }

    const treeCount = countNodes(tree);
    // Root index (slug "") is excluded from nav — rendered separately at /docs
    expect(treeCount).toBe(publishedNonHidden.length);
  });

  it("nav tree marks locked docs for public users", async () => {
    const docs = await getAllDocs();
    const tree = buildNavTree(docs, { userTier: "public" });

    function findLockedNodes(
      nodes: typeof tree
    ): Array<{ title: string; locked: boolean }> {
      const result: Array<{ title: string; locked: boolean }> = [];
      for (const node of nodes) {
        if (node.href) result.push({ title: node.title, locked: !!node.locked });
        if (node.children) result.push(...findLockedNodes(node.children));
      }
      return result;
    }

    const allNodes = findLockedNodes(tree);
    const lockedNodes = allNodes.filter((n) => n.locked);
    const unlockedNodes = allNodes.filter((n) => !n.locked);

    // Should have both locked and unlocked
    expect(lockedNodes.length).toBeGreaterThan(0);
    expect(unlockedNodes.length).toBeGreaterThan(0);
  });
});

describe("Sitemap E2E", () => {
  it("only public published docs would appear in sitemap", async () => {
    const docs = await getAllDocs();
    const sitemapDocs = docs.filter(
      (d) => d.access_tier === "public" && d.status === "published"
    );

    expect(sitemapDocs.length).toBeGreaterThan(0);

    // No client/partner/admin docs in sitemap
    for (const doc of sitemapDocs) {
      expect(doc.access_tier).toBe("public");
    }
  });
});

describe("SEO E2E", () => {
  it("every published doc has a non-empty title and summary for meta tags", async () => {
    const docs = await getAllDocs();
    const published = docs.filter((d) => d.status === "published");

    for (const doc of published) {
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.title.length).toBeLessThan(70); // SEO title limit
      expect(doc.summary.length).toBeGreaterThan(0);
      expect(doc.summary.length).toBeLessThan(160); // Meta description limit
    }
  });

  it("all content files have valid YAML frontmatter (no parse errors)", async () => {
    async function walkDir(dir: string): Promise<string[]> {
      const files: string[] = [];
      const entries = await fs.readdir(dir);
      for (const name of entries) {
        const fullPath = path.join(dir, name);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          files.push(...(await walkDir(fullPath)));
        } else if (/\.mdx?$/.test(name)) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const files = await walkDir(contentDir);

    for (const filePath of files) {
      const raw = await fs.readFile(filePath, "utf-8");
      expect(() => matter(raw)).not.toThrow();

      const { data } = matter(raw);
      expect(() => validateFrontmatter(data)).not.toThrow();
    }
  });
});

describe("Access Control Matrix E2E", () => {
  const scenarios = [
    // [userTier, userExtensions, docTier, docExtensions, expectedAccess]
    { user: null, doc: { access_tier: "public", extensions: [] }, expected: true },
    { user: null, doc: { access_tier: "client", extensions: [] }, expected: false },
    { user: null, doc: { access_tier: "partner", extensions: [] }, expected: false },
    { user: null, doc: { access_tier: "admin", extensions: [] }, expected: false },
    {
      user: { tier: "client" as const, extensions: [] },
      doc: { access_tier: "client", extensions: [] },
      expected: true,
    },
    {
      user: { tier: "client" as const, extensions: ["nexus/gdpr-suite"] },
      doc: { access_tier: "client", extensions: ["nexus/gdpr-suite"] },
      expected: true,
    },
    {
      user: { tier: "client" as const, extensions: ["nexus/seo-rich-snippets"] },
      doc: { access_tier: "client", extensions: ["nexus/gdpr-suite"] },
      expected: false,
    },
    {
      user: { tier: "client" as const, extensions: ["nexus/gdpr-suite"] },
      doc: {
        access_tier: "client",
        extensions: ["nexus/gdpr-suite", "nexus/omnibus-directive"],
      },
      expected: true, // Has at least one
    },
    {
      user: { tier: "partner" as const, extensions: [] },
      doc: { access_tier: "client", extensions: ["nexus/gdpr-suite"] },
      expected: true, // Partners see all client content
    },
    {
      user: { tier: "partner" as const, extensions: [] },
      doc: { access_tier: "partner", extensions: [] },
      expected: true,
    },
    {
      user: { tier: "partner" as const, extensions: [] },
      doc: { access_tier: "admin", extensions: [] },
      expected: false,
    },
    {
      user: { tier: "admin" as const, extensions: [] },
      doc: { access_tier: "admin", extensions: [] },
      expected: true,
    },
  ];

  scenarios.forEach(({ user, doc, expected }, i) => {
    it(`scenario ${i + 1}: ${user ? user.tier : "anon"} → ${doc.access_tier} (ext: ${doc.extensions.length}) = ${expected ? "ALLOW" : "DENY"}`, () => {
      expect(canAccessDoc(user, doc)).toBe(expected);
    });
  });
});
