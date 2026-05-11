import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllDocs } from "@/lib/content";

interface ExtensionGridProps {
  /** Path prefix to filter docs by (e.g. "extensions/speed"). */
  path: string;
  /** Number of columns on large screens. Defaults to 4. */
  columns?: 2 | 3 | 4;
  /** Hide the parent doc itself if it matches the path. Defaults to true. */
  excludeIndex?: boolean;
}

export async function ExtensionGrid({
  path,
  columns = 4,
  excludeIndex = true,
}: ExtensionGridProps) {
  const allDocs = await getAllDocs();
  const prefix = path.replace(/^\/+|\/+$/g, "");

  // Direct children only — match docs whose slug is one segment deeper than path.
  const children = allDocs.filter((doc) => {
    if (doc.status !== "published") return false;
    if (doc.nav_hidden) return false;
    if (!doc.slug.startsWith(`${prefix}/`)) return false;
    if (excludeIndex && doc.slug === prefix) return false;
    const remainder = doc.slug.slice(prefix.length + 1);
    return !remainder.includes("/");
  });

  children.sort((a, b) => {
    if (a.nav_order !== b.nav_order) return a.nav_order - b.nav_order;
    return a.title.localeCompare(b.title);
  });

  if (children.length === 0) {
    return (
      <div className="not-prose my-6 rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
        No extensions found under <code className="font-mono">{path}</code>.
      </div>
    );
  }

  const colClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div className={`not-prose my-6 grid grid-cols-1 gap-4 ${colClass}`}>
      {children.map((doc) => (
        <Link
          key={doc.slug}
          href={`/docs/${doc.slug}`}
          className="group flex h-full flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-brand-400 hover:bg-[var(--color-surface-secondary)]"
        >
          <h3 className="font-medium text-[var(--color-text-primary)] group-hover:text-brand-600">
            {doc.title}
          </h3>
          {doc.summary && (
            <p className="mt-2 line-clamp-3 flex-1 text-sm text-[var(--color-text-muted)]">
              {doc.summary}
            </p>
          )}
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
            View <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}
