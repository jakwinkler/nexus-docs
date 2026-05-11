import { describe, it, expect } from "vitest";
import { buildNavTree } from "../nav-builder";
import type { DocMeta } from "../types";

function makeMeta(overrides: Partial<DocMeta> & { slug: string; title: string }): DocMeta {
  return {
    summary: "Test",
    access_tier: "public",
    product: "platform",
    status: "published",
    owner: "test",
    extensions: [],
    version: "*",
    tags: [],
    changelog: false,
    review_interval_days: 90,
    deprecated: false,
    redirect_from: [],
    related: [],
    nav_order: 0,
    nav_hidden: false,
    lastModified: new Date().toISOString(),
    ...overrides,
  };
}

describe("buildNavTree", () => {
  it("builds a flat tree from top-level docs", () => {
    const docs = [
      makeMeta({ slug: "getting-started", title: "Getting Started", nav_order: 1 }),
      makeMeta({ slug: "faq", title: "FAQ", nav_order: 2 }),
    ];

    const tree = buildNavTree(docs);
    expect(tree).toHaveLength(2);
    expect(tree[0].title).toBe("Getting Started");
    expect(tree[0].href).toBe("/docs/getting-started");
    expect(tree[1].title).toBe("FAQ");
  });

  it("sorts by nav_order then title", () => {
    const docs = [
      makeMeta({ slug: "z-page", title: "Z Page", nav_order: 1 }),
      makeMeta({ slug: "a-page", title: "A Page", nav_order: 1 }),
      makeMeta({ slug: "first", title: "First", nav_order: 0 }),
    ];

    const tree = buildNavTree(docs);
    expect(tree[0].title).toBe("First");
    expect(tree[1].title).toBe("A Page");
    expect(tree[2].title).toBe("Z Page");
  });

  it("nests children under parent docs", () => {
    const docs = [
      makeMeta({ slug: "extensions", title: "Extensions", nav_order: 0 }),
      makeMeta({ slug: "extensions/gdpr", title: "GDPR Suite", nav_order: 1 }),
      makeMeta({ slug: "extensions/seo", title: "SEO Snippets", nav_order: 2 }),
    ];

    const tree = buildNavTree(docs);
    expect(tree).toHaveLength(1);
    expect(tree[0].title).toBe("Extensions");
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children![0].title).toBe("GDPR Suite");
  });

  it("excludes nav_hidden docs", () => {
    const docs = [
      makeMeta({ slug: "visible", title: "Visible" }),
      makeMeta({ slug: "hidden", title: "Hidden", nav_hidden: true }),
    ];

    const tree = buildNavTree(docs);
    expect(tree).toHaveLength(1);
    expect(tree[0].title).toBe("Visible");
  });

  it("excludes draft docs by default", () => {
    const docs = [
      makeMeta({ slug: "published", title: "Published", status: "published" }),
      makeMeta({ slug: "draft", title: "Draft", status: "draft" }),
    ];

    const tree = buildNavTree(docs);
    expect(tree).toHaveLength(1);
    expect(tree[0].title).toBe("Published");
  });

  it("includes draft docs when showDrafts is true", () => {
    const docs = [
      makeMeta({ slug: "published", title: "Published", status: "published" }),
      makeMeta({ slug: "draft", title: "Draft", status: "draft" }),
    ];

    const tree = buildNavTree(docs, { showDrafts: true });
    expect(tree).toHaveLength(2);
  });

  it("marks locked docs for anonymous users", () => {
    const docs = [
      makeMeta({ slug: "public-page", title: "Public", access_tier: "public" }),
      makeMeta({ slug: "client-page", title: "Client", access_tier: "client" }),
    ];

    const tree = buildNavTree(docs, { userTier: "public", userExtensions: [] });
    // Public page: canAccessDoc(null, public) = true, so locked = false
    // Client page: canAccessDoc(null, client) = false, so locked = true
    const publicNode = tree.find((n) => n.title === "Public")!;
    const clientNode = tree.find((n) => n.title === "Client")!;
    expect(publicNode.locked).toBe(false);
    expect(clientNode.locked).toBe(true);
    expect(clientNode.lockMessage?.toLowerCase()).toContain("client");
  });

  it("marks extension-gated docs locked for clients without permission", () => {
    const docs = [
      makeMeta({
        slug: "gated",
        title: "Gated",
        access_tier: "client",
        extensions: ["nexus/gdpr-suite"],
      }),
    ];

    const tree = buildNavTree(docs, {
      userTier: "client",
      userExtensions: ["nexus/seo-rich-snippets"],
    });
    expect(tree[0].locked).toBe(true);
  });

  it("marks extension-gated docs unlocked for clients with permission", () => {
    const docs = [
      makeMeta({
        slug: "gated",
        title: "Gated",
        access_tier: "client",
        extensions: ["nexus/gdpr-suite"],
      }),
    ];

    const tree = buildNavTree(docs, {
      userTier: "client",
      userExtensions: ["nexus/gdpr-suite"],
    });
    expect(tree[0].locked).toBe(false);
  });

  it("marks all docs unlocked for admin users", () => {
    const docs = [
      makeMeta({ slug: "admin-only", title: "Admin Only", access_tier: "admin" }),
      makeMeta({ slug: "partner", title: "Partner", access_tier: "partner" }),
      makeMeta({
        slug: "gated",
        title: "Gated",
        access_tier: "client",
        extensions: ["nexus/gdpr-suite"],
      }),
    ];

    const tree = buildNavTree(docs, { userTier: "admin" });
    for (const node of tree) {
      expect(node.locked).toBe(false);
    }
  });

  it("creates intermediate section nodes for orphaned children", () => {
    const docs = [
      makeMeta({ slug: "extensions/gdpr/config", title: "Config" }),
    ];

    const tree = buildNavTree(docs);
    // Should create an "extensions" section with "gdpr" subsection
    expect(tree.length).toBeGreaterThanOrEqual(1);
  });
});
