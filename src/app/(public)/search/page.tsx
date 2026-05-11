import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Lock } from "lucide-react";
import { searchClient, DOCS_INDEX } from "@/lib/meilisearch/client";
import { auth } from "@/lib/auth";
import { getAccessFilter } from "@/lib/acl";
import { prisma } from "@/lib/db";
import type { AccessTier } from "@/lib/content";

export const metadata: Metadata = {
  title: "Search Documentation",
  description: "Search across all nexus documentation — extensions, guides, API references, and developer resources.",
  robots: { index: false, follow: true },
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string; product?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, product, page: pageParam } = await searchParams;
  const page = parseInt(pageParam || "1", 10);
  const limit = 20;

  let hits: Array<{
    slug: string;
    title: string;
    summary: string;
    product: string;
    access_tier: string;
    tags: string[];
    _formatted?: Record<string, string>;
  }> = [];
  let totalHits = 0;

  if (q?.trim()) {
    try {
      // Get user ACL
      const session = await auth();
      let userACL: { tier: AccessTier; extensions: string[] } | null = null;

      if (session?.user) {
        const permissions = await prisma.userPermission.findMany({
          where: {
            userId: session.user.id,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: { extension: true },
        });
        userACL = {
          tier: session.user.tier as AccessTier,
          extensions: permissions.map((p) => p.extension),
        };
      }

      const aclFilter = getAccessFilter(userACL);
      const filters: string[] = [];
      if (aclFilter) filters.push(aclFilter);
      if (product) {
        // Sanitize product to prevent Meilisearch filter injection
        const sanitizedProduct = product.replace(/["\\]/g, "");
        if (sanitizedProduct) filters.push(`product = "${sanitizedProduct}"`);
      }
      filters.push('status != "draft"');

      const index = searchClient.index(DOCS_INDEX);
      const results = await index.search(q, {
        filter: filters.length > 0 ? filters.join(" AND ") : undefined,
        limit,
        offset: (page - 1) * limit,
        attributesToHighlight: ["title", "summary"],
        attributesToCrop: ["content"],
        cropLength: 200,
      });

      hits = results.hits as typeof hits;
      totalHits = results.estimatedTotalHits || 0;
    } catch {
      // Meilisearch not available
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        Search Documentation
      </h1>

      {/* Search form */}
      <form className="mt-6" action="/search" method="GET">
        <div className="flex gap-2">
          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Search docs..."
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Results */}
      {q && (
        <div className="mt-8">
          <p className="text-sm text-[var(--color-text-muted)]">
            {totalHits} result{totalHits !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
          </p>

          <div className="mt-4 space-y-4">
            {hits.map((hit) => (
              <Link
                key={hit.slug}
                href={`/docs/${hit.slug}`}
                className="block rounded-lg border border-[var(--color-border)] p-4 hover:border-brand-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <h2 className="text-sm font-medium text-[var(--color-text-primary)]">
                    {hit.title}
                  </h2>
                  {hit.access_tier !== "public" && (
                    <Lock className="h-3 w-3 text-[var(--color-text-muted)]" />
                  )}
                  <span className="ml-auto rounded bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                    {hit.product}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {hit.summary}
                </p>
                {hit.tags.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {hit.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalHits > limit && (
            <div className="mt-8 flex justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface-secondary)]"
                >
                  Previous
                </Link>
              )}
              {page * limit < totalHits && (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface-secondary)]"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
