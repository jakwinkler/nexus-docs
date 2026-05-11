import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Search Index" };
export const dynamic = "force-dynamic";

async function getIndexStats() {
  const meiliHost = process.env.MEILISEARCH_URL;
  const meiliKey = process.env.MEILISEARCH_KEY;

  if (!meiliHost) {
    return null;
  }

  try {
    const res = await fetch(`${meiliHost}/indexes/docs/stats`, {
      headers: meiliKey ? { Authorization: `Bearer ${meiliKey}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      numberOfDocuments: number;
      isIndexing: boolean;
      fieldDistribution: Record<string, number>;
    };
  } catch {
    return null;
  }
}

export default async function SearchIndexPage() {
  const stats = await getIndexStats();

  return (
    <div>
      <PageHeader
        title="Search Index"
        description="Manage the Meilisearch index for documentation search"
      />

      {!stats ? (
        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8 text-center">
          <p className="text-[var(--color-text-muted)]">
            Meilisearch is not available. Check that <code className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-xs">MEILISEARCH_URL</code> is
            configured and the service is running.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--color-border)] p-4">
              <p className="text-sm text-[var(--color-text-muted)]">Indexed Documents</p>
              <p className="mt-1 text-2xl font-bold">{stats.numberOfDocuments}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] p-4">
              <p className="text-sm text-[var(--color-text-muted)]">Status</p>
              <p className="mt-1 text-2xl font-bold">
                {stats.isIndexing ? (
                  <span className="text-yellow-600">Indexing...</span>
                ) : (
                  <span className="text-green-600">Ready</span>
                )}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] p-4">
              <p className="text-sm text-[var(--color-text-muted)]">Fields Tracked</p>
              <p className="mt-1 text-2xl font-bold">
                {Object.keys(stats.fieldDistribution).length}
              </p>
            </div>
          </div>

          {/* Field distribution */}
          <div className="rounded-lg border border-[var(--color-border)]">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3">
              <h2 className="text-sm font-medium">Field Distribution</h2>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {Object.entries(stats.fieldDistribution).length === 0 ? (
                <div className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  No fields indexed yet
                </div>
              ) : (
                Object.entries(stats.fieldDistribution).map(([field, count]) => (
                  <div key={field} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="font-mono text-[var(--color-text-secondary)]">{field}</span>
                    <span className="text-[var(--color-text-muted)]">{count} docs</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
