import type { Metadata } from "next";
import Link from "next/link";
import { getAllDocs } from "@/lib/content";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docs.example.com";

export const metadata: Metadata = {
  title: "All Tags",
  description: "Browse documentation by topic.",
  alternates: { canonical: `${siteUrl}/docs/tags` },
};

export default async function TagsIndexPage() {
  const docs = await getAllDocs();
  const counts = new Map<string, number>();

  for (const doc of docs) {
    if (doc.status !== "published" || doc.nav_hidden) continue;
    for (const tag of doc.tags) {
      const t = tag.toLowerCase();
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  const tags = Array.from(counts.entries()).sort(([, a], [, b]) => b - a);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">Browse by Tag</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        {tags.length} tags across {docs.length} pages.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {tags.map(([tag, count]) => (
          <Link
            key={tag}
            href={`/docs/tags/${tag}`}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950"
          >
            {tag.replace(/-/g, " ")}{" "}
            <span className="text-[var(--color-text-muted)]">({count})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
