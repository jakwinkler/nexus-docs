import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllDocs } from "@/lib/content";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessDoc, getUserACLContext } from "@/lib/acl";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

function tagDisplay(tag: string): string {
  return tag
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getDocsForTag(tag: string) {
  const all = await getAllDocs();
  const normalized = tag.toLowerCase();
  return all.filter(
    (doc) =>
      doc.status === "published" &&
      !doc.nav_hidden &&
      doc.tags.some((t) => t.toLowerCase() === normalized),
  );
}

export async function generateStaticParams() {
  const docs = await getAllDocs();
  const tags = new Set<string>();
  for (const doc of docs) {
    if (doc.status !== "published" || doc.nav_hidden) continue;
    for (const tag of doc.tags) tags.add(tag.toLowerCase());
  }
  return Array.from(tags).map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const display = tagDisplay(tag);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docs.example.com";
  return {
    title: `Tag: ${display}`,
    description: `All documentation pages tagged "${display}".`,
    alternates: { canonical: `${siteUrl}/docs/tags/${tag}` },
    openGraph: {
      title: `Tag: ${display} | nexus Docs`,
      description: `All documentation pages tagged "${display}".`,
      url: `${siteUrl}/docs/tags/${tag}`,
      type: "website",
    },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const docs = await getDocsForTag(tag);

  if (docs.length === 0) notFound();

  // Filter docs the current user is allowed to see
  const session = await auth();
  let aclUser = null;
  if (session?.user) {
    const permissions = await prisma.userPermission.findMany({
      where: {
        userId: session.user.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { extension: true },
    });
    aclUser = getUserACLContext(
      session.user.tier as string,
      permissions.map((p) => p.extension),
    );
  }

  const visible = docs.filter((doc) => canAccessDoc(aclUser, doc));

  // Group by top-level section (first slug segment)
  const grouped = new Map<string, typeof visible>();
  for (const doc of visible) {
    const section = doc.slug.split("/")[0];
    const arr = grouped.get(section) ?? [];
    arr.push(doc);
    grouped.set(section, arr);
  }

  const display = tagDisplay(tag);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="mb-4 text-sm text-[var(--color-text-muted)]">
        <Link href="/docs" className="hover:text-[var(--color-text-primary)]">
          Docs
        </Link>{" "}
        &nbsp;/&nbsp;{" "}
        <Link href="/docs/tags" className="hover:text-[var(--color-text-primary)]">
          Tags
        </Link>{" "}
        &nbsp;/&nbsp; <span className="text-[var(--color-text-primary)]">{display}</span>
      </nav>

      <h1 className="text-3xl font-bold">
        Pages tagged{" "}
        <span className="rounded bg-brand-50 px-2 py-1 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {display}
        </span>
      </h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        {visible.length} {visible.length === 1 ? "page" : "pages"}.
      </p>

      <div className="mt-8 space-y-8">
        {Array.from(grouped.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([section, sectionDocs]) => (
            <section key={section}>
              <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                {section.replace(/-/g, " ")}
              </h2>
              <ul className="mt-3 space-y-2">
                {sectionDocs
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((doc) => (
                    <li key={doc.slug}>
                      <Link
                        href={`/docs/${doc.slug}`}
                        className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-brand-400"
                      >
                        <div className="font-medium">{doc.title}</div>
                        {doc.summary && (
                          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                            {doc.summary}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
      </div>
    </div>
  );
}
