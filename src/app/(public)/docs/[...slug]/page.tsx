import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { DocPageJsonLd } from "@/components/seo/json-ld";
import { LockedContent } from "@/components/issues/locked-content";
import { MdxRenderer } from "@/components/markdown/mdx-renderer";
import { VideoEmbed } from "@/components/video/video-embed";
import { TableOfContents } from "@/components/docs/table-of-contents";
import { PrevNextNav } from "@/components/docs/prev-next-nav";
import { DocPageMeta } from "@/components/docs/doc-page-meta";
import { FeedbackWidget } from "@/components/docs/feedback-widget";
import { ReportIssue } from "@/components/issues/report-issue";

import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { PageProgressBar } from "@/components/ui/page-progress-bar";
import { getDocBySlug, getAllDocs, buildNavTree, getScopedNav } from "@/lib/content";
import { auth } from "@/lib/auth";
import { checkAccess, getTierRank, getUserACLContext } from "@/lib/acl";
import { prisma } from "@/lib/db";

export const dynamicParams = true;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docs.example.com";

interface DocPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  try {
    const docs = await getAllDocs();
    return docs
      .filter((doc) => doc.status === "published" && doc.slug !== "")
      .map((doc) => ({ slug: doc.slug.split("/") }));
  } catch {
    // Build without DB/content — will use SSR fallback
    return [];
  }
}

export async function generateMetadata({
  params,
}: DocPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);
  if (!doc) return {};

  const url = `${siteUrl}/docs/${slug.join("/")}`;

  // For non-public pages, check ACL before exposing metadata
  if (doc.access_tier !== "public") {
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
        permissions.map((p) => p.extension)
      );
    }
    const result = checkAccess(aclUser, doc);

    if (!result.allowed) {
      // Private tier → don't even expose the title
      if (result.visibility === "private") {
        return { robots: { index: false, follow: false } };
      }
      // Protected tier → expose title only
      return {
        title: doc.title,
        description: "This content requires authentication to access.",
        robots: { index: false, follow: true },
        alternates: { canonical: url },
      };
    }
  }

  // Build a rich title from breadcrumb path
  // e.g. "Apache" → "Apache — Web Servers — Trident"
  const breadcrumbParts = await Promise.all(
    slug.map(async (_, i) => {
      const parentSlug = slug.slice(0, i + 1);
      const parentDoc = await getDocBySlug(parentSlug);
      return parentDoc?.title || parentSlug[parentSlug.length - 1].replace(/-/g, " ");
    })
  );
  const richTitle = breadcrumbParts.reverse().join(" — ");

  return {
    title: richTitle,
    description: doc.summary,
    keywords: doc.tags.length > 0 ? doc.tags : undefined,
    authors: [{ name: doc.owner }],
    openGraph: {
      title: `${richTitle} | nexus Docs`,
      description: doc.summary,
      url,
      type: "article",
      modifiedTime: doc.lastModified,
      tags: doc.tags,
      section: doc.product,
      locale: "en_US",
      siteName: "nexus Docs",
      images: [
        {
          url: `${siteUrl}/api/og?slug=${encodeURIComponent(doc.slug)}`,
          width: 1200,
          height: 630,
          alt: doc.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: doc.title,
      description: doc.summary,
      images: [`${siteUrl}/api/og?slug=${encodeURIComponent(doc.slug)}`],
    },
    alternates: {
      canonical: url,
    },
    other: {
      "article:modified_time": doc.lastModified,
      "article:section": doc.product,
      "article:tag": doc.tags.join(","),
    },
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

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
      permissions.map((p) => p.extension)
    );
  }
  // userACL is always defined for nav-building (falls back to public context when not authenticated)
  const userACL = aclUser ?? getUserACLContext("public", []);

  // Build nav from content index
  const allDocs = await getAllDocs();
  const navTree = buildNavTree(allDocs, {
    userTier: userACL.tier,
    userExtensions: userACL.extensions,
    showDrafts: userACL.tier === "admin",
  });

  const currentPath = `/docs/${slug.join("/")}`;
  const navItems = getScopedNav(navTree, currentPath);

  // ACL check: aclUser is null only when there is no session (truly anonymous)
  const accessResult = checkAccess(aclUser, doc);

  if (!accessResult.allowed) {
    // Private tier → completely hidden, show 404
    if (accessResult.visibility === "private") {
      notFound();
    }

    // Protected tier → show locked content page with "Request Access"
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8 py-8">
          <Sidebar items={navItems} />
          <div className="min-w-0 flex-1">
            <LockedContent
              title={doc.title}
              requiredTier={doc.access_tier}
              requiredTierLabel={accessResult.requiredTier?.label || doc.access_tier}
              userTier={userACL.tier}
              extensions={doc.extensions}
            />
          </div>
        </div>
      </div>
    );
  }

  const currentSlug = slug.join("/");
  const url = `${siteUrl}/docs/${currentSlug}`;
  const breadcrumbs = slug.map((segment, i) => ({
    name: segment.replace(/-/g, " "),
    url: `${siteUrl}/docs/${slug.slice(0, i + 1).join("/")}`,
  }));

  return (
    <>
      <DocPageJsonLd
        title={doc.title}
        summary={doc.summary}
        url={url}
        dateModified={doc.lastModified}
        product={doc.product}
        tags={doc.tags}
        owner={doc.owner}
        breadcrumbs={[{ name: "Docs", url: `${siteUrl}/docs` }, ...breadcrumbs]}
      />

      {/* Mobile navigation bar (visible below lg breakpoint) */}
      <div className="sticky top-16 z-40 flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 lg:hidden">
        <MobileSidebar items={navItems} />
        <nav
          aria-label="Breadcrumb"
          className="text-sm text-[var(--color-text-muted)] truncate"
        >
          <ol className="flex items-center gap-1">
            <li>
              <Link href="/docs" className="hover:text-[var(--color-text-primary)]">
                Docs
              </Link>
            </li>
            {slug.map((segment, i) => (
              <li key={segment} className="flex items-center gap-1">
                <span>/</span>
                {i === slug.length - 1 ? (
                  <span className="text-[var(--color-text-primary)] truncate">
                    {segment.replace(/-/g, " ")}
                  </span>
                ) : (
                  <Link
                    href={`/docs/${slug.slice(0, i + 1).join("/")}`}
                    className="hover:text-[var(--color-text-primary)]"
                  >
                    {segment.replace(/-/g, " ")}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8 py-8">
          {/* Desktop sidebar */}
          <Sidebar items={navItems} />

          {/* Main content */}
          <article className="min-w-0 flex-1">
            {/* Desktop breadcrumbs */}
            <nav
              aria-label="Breadcrumb"
              className="mb-6 text-sm text-[var(--color-text-muted)] hidden lg:block"
            >
              <ol className="flex items-center gap-1.5">
                <li>
                  <Link href="/docs" className="hover:text-[var(--color-text-primary)]">
                    Docs
                  </Link>
                </li>
                {slug.map((segment, i) => (
                  <li key={segment} className="flex items-center gap-1.5">
                    <span>/</span>
                    {i === slug.length - 1 ? (
                      <span className="text-[var(--color-text-primary)]">
                        {segment.replace(/-/g, " ")}
                      </span>
                    ) : (
                      <Link
                        href={`/docs/${slug.slice(0, i + 1).join("/")}`}
                        className="hover:text-[var(--color-text-primary)]"
                      >
                        {segment.replace(/-/g, " ")}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            {/* Reading time and metadata */}
            <DocPageMeta
              content={doc.content}
              lastModified={doc.lastModified}
              owner={doc.owner}
            />

            {/* Deprecation banner */}
            {doc.status === "deprecated" && (
              <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
                <strong>Deprecated:</strong> This page is no longer maintained and may contain outdated information.
              </div>
            )}

            {/* Featured video from frontmatter */}
            {doc.video && (
              <VideoEmbed src={doc.video} title={`${doc.title} — video`} />
            )}

            {/* Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:no-underline [&_h1_a]:no-underline [&_h2_a]:no-underline [&_h3_a]:no-underline [&_h4_a]:no-underline prose-a:text-brand-600 prose-code:before:content-none prose-code:after:content-none">
              <MdxRenderer source={doc.content} userTierRank={userACL.tierRank} />
            </div>

            {/* Feedback + Report Issue — clients and partners only.
                Anonymous and public-tier users see neither: anything else
                just attracted bot/scraper spam without admin attention. */}
            {userACL.tierRank >= getTierRank("client") && (
              <>
                <div className="mt-12 border-t border-[var(--color-border)] pt-6">
                  <FeedbackWidget slug={currentSlug} />
                </div>
                <div className="mt-6">
                  <ReportIssue
                    pagePath={`/docs/${currentSlug}`}
                    pageTitle={doc.title}
                  />
                </div>
              </>
            )}

            {/* Previous / Next navigation */}
            <PrevNextNav currentSlug={currentSlug} navItems={navItems} />
          </article>

          {/* Table of contents (right sidebar) */}
          <TableOfContents />
        </div>
      </div>

      {/* Page progress bar */}
      <PageProgressBar />

      {/* Scroll to top */}
      <ScrollToTop />
    </>
  );
}
