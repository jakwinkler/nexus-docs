import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing
vi.mock("../client", () => ({
  searchClient: {
    index: vi.fn().mockReturnValue({
      addDocuments: vi.fn().mockResolvedValue({ taskUid: 1 }),
      deleteDocument: vi.fn().mockResolvedValue({ taskUid: 2 }),
      deleteDocuments: vi.fn().mockResolvedValue({ taskUid: 3 }),
      getDocuments: vi.fn().mockResolvedValue({ results: [] }),
    }),
  },
  DOCS_INDEX: "docs",
}));

vi.mock("@/lib/content", async () => {
  const actual = await vi.importActual<typeof import("@/lib/content")>("@/lib/content");
  return {
    ...actual,
    getAllDocs: vi.fn(),
    getDocBySlug: vi.fn(),
  };
});

import { indexAllDocs, indexDoc, removeDoc } from "../indexer";
import { searchClient } from "../client";
import { getAllDocs, getDocBySlug } from "@/lib/content";

const mockGetAllDocs = getAllDocs as ReturnType<typeof vi.fn>;
const mockGetDocBySlug = getDocBySlug as ReturnType<typeof vi.fn>;
const mockIndex = searchClient.index as ReturnType<typeof vi.fn>;

function makeMockDoc(overrides: Record<string, unknown> = {}) {
  return {
    slug: "extensions/gdpr-suite",
    title: "GDPR Suite",
    summary: "GDPR compliance tools",
    content: "# GDPR Suite\n\nThis is the content.",
    access_tier: "public",
    extensions: [],
    product: "gdpr-suite",
    version: "*",
    status: "published",
    tags: ["gdpr"],
    owner: "jakub",
    nav_order: 0,
    last_verified_at: "2026-01-01",
    lastModified: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("stripMdx (tested via indexDoc transformation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIndex.mockReturnValue({
      addDocuments: vi.fn().mockResolvedValue({ taskUid: 1 }),
      deleteDocument: vi.fn().mockResolvedValue({ taskUid: 2 }),
      deleteDocuments: vi.fn().mockResolvedValue({ taskUid: 3 }),
      getDocuments: vi.fn().mockResolvedValue({ results: [] }),
    });
  });

  it("strips frontmatter from content", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({
        content: "---\ntitle: Test\nsummary: Test doc\n---\n\nActual content here.",
      })
    );

    await indexDoc("test/doc");

    const addDocuments = mockIndex("docs").addDocuments;
    const call = addDocuments.mock.calls[0][0][0];
    expect(call.content).not.toContain("---");
    expect(call.content).toContain("Actual content here.");
  });

  it("strips HTML tags from content", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({
        content: "<div class=\"wrapper\"><p>Hello</p></div>",
      })
    );

    await indexDoc("test/doc");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.content).not.toContain("<div");
    expect(call.content).not.toContain("<p>");
    expect(call.content).toContain("Hello");
  });

  it("strips code blocks from content", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({
        content: "Before code\n\n```typescript\nconst x = 1;\n```\n\nAfter code",
      })
    );

    await indexDoc("test/doc");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.content).not.toContain("```");
    expect(call.content).not.toContain("const x = 1");
    expect(call.content).toContain("Before code");
    expect(call.content).toContain("After code");
  });

  it("strips inline code from content", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({
        content: "Use the `getDoc()` function to load.",
      })
    );

    await indexDoc("test/doc");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.content).not.toContain("`");
    expect(call.content).toContain("Use the");
    expect(call.content).toContain("function to load.");
  });

  it("strips markdown syntax characters", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({
        content: "# Heading\n\n**Bold** text and *italic* text.\n\n- List item\n\n[Link](http://example.com)\n\n> Quote",
      })
    );

    await indexDoc("test/doc");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.content).not.toContain("#");
    expect(call.content).not.toContain("**");
    expect(call.content).not.toContain("[");
    expect(call.content).not.toContain(">");
  });

  it("collapses multiple newlines", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({
        content: "Line one\n\n\n\n\nLine two",
      })
    );

    await indexDoc("test/doc");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.content).not.toMatch(/\n{3,}/);
  });

  it("trims leading and trailing whitespace", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({
        content: "   \n\n  Content here  \n\n   ",
      })
    );

    await indexDoc("test/doc");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.content).toBe("Content here");
  });

  it("handles empty content", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({ content: "" })
    );

    await indexDoc("test/doc");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.content).toBe("");
  });
});

describe("Document transformation (slug to id)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIndex.mockReturnValue({
      addDocuments: vi.fn().mockResolvedValue({ taskUid: 1 }),
      deleteDocument: vi.fn().mockResolvedValue({ taskUid: 2 }),
      deleteDocuments: vi.fn().mockResolvedValue({ taskUid: 3 }),
      getDocuments: vi.fn().mockResolvedValue({ results: [] }),
    });
  });

  it("converts slug slashes to hyphens for the id", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({ slug: "extensions/gdpr-suite/config" })
    );

    await indexDoc("extensions/gdpr-suite/config");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.id).toBe("extensions-gdpr-suite-config");
    expect(call.slug).toBe("extensions/gdpr-suite/config");
  });

  it("handles single-segment slug", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({ slug: "getting-started" })
    );

    await indexDoc("getting-started");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.id).toBe("getting-started");
  });

  it("handles deeply nested slug", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({ slug: "a/b/c/d/e" })
    );

    await indexDoc("a/b/c/d/e");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.id).toBe("a-b-c-d-e");
  });

  it("truncates content to 10000 characters", async () => {
    const longContent = "A".repeat(20000);
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({ content: longContent })
    );

    await indexDoc("test/doc");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.content.length).toBeLessThanOrEqual(10000);
  });

  it("sets last_verified_at to null when not present", async () => {
    mockGetDocBySlug.mockResolvedValue(
      makeMockDoc({ last_verified_at: undefined })
    );

    await indexDoc("test/doc");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.last_verified_at).toBeNull();
  });
});

describe("indexAllDocs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIndex.mockReturnValue({
      addDocuments: vi.fn().mockResolvedValue({ taskUid: 1 }),
      deleteDocument: vi.fn().mockResolvedValue({ taskUid: 2 }),
      deleteDocuments: vi.fn().mockResolvedValue({ taskUid: 3 }),
      getDocuments: vi.fn().mockResolvedValue({ results: [] }),
    });
  });

  it("indexes all non-draft docs", async () => {
    mockGetAllDocs.mockResolvedValue([
      makeMockDoc({ slug: "doc-1", status: "published" }),
      makeMockDoc({ slug: "doc-2", status: "published" }),
      makeMockDoc({ slug: "draft-doc", status: "draft" }),
    ]);
    mockGetDocBySlug.mockImplementation((slugParts: string[]) => {
      const slug = slugParts.join("/");
      if (slug === "draft-doc") return null;
      return Promise.resolve(makeMockDoc({ slug }));
    });

    const count = await indexAllDocs();

    expect(count).toBe(2);
    const addDocuments = mockIndex("docs").addDocuments;
    expect(addDocuments).toHaveBeenCalledOnce();
    const docs = addDocuments.mock.calls[0][0];
    expect(docs).toHaveLength(2);
    expect(docs.every((d: { id: string }) => !d.id.includes("draft"))).toBe(true);
  });

  it("indexes all non-draft docs returned by getAllDocs with content", async () => {
    mockGetAllDocs.mockResolvedValue([
      makeMockDoc({ slug: "exists", status: "published" }),
      makeMockDoc({ slug: "another", status: "published" }),
    ]);

    const count = await indexAllDocs();
    expect(count).toBe(2);
  });

  it("returns 0 when all docs are drafts", async () => {
    mockGetAllDocs.mockResolvedValue([
      makeMockDoc({ slug: "draft-1", status: "draft" }),
      makeMockDoc({ slug: "draft-2", status: "draft" }),
    ]);

    const count = await indexAllDocs();
    expect(count).toBe(0);
  });

  it("returns 0 when no docs exist", async () => {
    mockGetAllDocs.mockResolvedValue([]);

    const count = await indexAllDocs();
    expect(count).toBe(0);
  });
});

describe("indexDoc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIndex.mockReturnValue({
      addDocuments: vi.fn().mockResolvedValue({ taskUid: 1 }),
      deleteDocument: vi.fn().mockResolvedValue({ taskUid: 2 }),
      deleteDocuments: vi.fn().mockResolvedValue({ taskUid: 3 }),
      getDocuments: vi.fn().mockResolvedValue({ results: [] }),
    });
  });

  it("does nothing when doc is not found", async () => {
    mockGetDocBySlug.mockResolvedValue(null);

    await indexDoc("nonexistent/doc");

    expect(mockIndex("docs").addDocuments).not.toHaveBeenCalled();
  });

  it("indexes a single doc with correct fields", async () => {
    const doc = makeMockDoc({
      slug: "extensions/gdpr-suite",
      tags: ["gdpr", "compliance"],
      extensions: ["nexus/gdpr-suite"],
    });
    mockGetDocBySlug.mockResolvedValue(doc);

    await indexDoc("extensions/gdpr-suite");

    const call = mockIndex("docs").addDocuments.mock.calls[0][0][0];
    expect(call.title).toBe("GDPR Suite");
    expect(call.tags).toEqual(["gdpr", "compliance"]);
    expect(call.extensions).toEqual(["nexus/gdpr-suite"]);
    expect(call.access_tier).toBe("public");
  });
});

describe("removeDoc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIndex.mockReturnValue({
      addDocuments: vi.fn().mockResolvedValue({ taskUid: 1 }),
      deleteDocument: vi.fn().mockResolvedValue({ taskUid: 2 }),
      deleteDocuments: vi.fn().mockResolvedValue({ taskUid: 3 }),
      getDocuments: vi.fn().mockResolvedValue({ results: [] }),
    });
  });

  it("deletes document by slug-derived id", async () => {
    await removeDoc("extensions/gdpr-suite");

    expect(mockIndex("docs").deleteDocument).toHaveBeenCalledWith("extensions-gdpr-suite");
  });

  it("handles single-segment slug for deletion", async () => {
    await removeDoc("getting-started");

    expect(mockIndex("docs").deleteDocument).toHaveBeenCalledWith("getting-started");
  });
});
