import type { MetadataRoute } from "next";
import { getAllDocs } from "@/lib/content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docs.example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    // /search is excluded — it's noindex; including it would just waste
    // crawl budget and contradict the meta robots tag.
  ];

  const docs = await getAllDocs();
  const publicDocs = docs.filter(
    (doc) =>
      doc.access_tier === "public" &&
      doc.status === "published" &&
      !doc.nav_hidden,
  );

  const docPages: MetadataRoute.Sitemap = publicDocs.map((doc) => ({
    url: `${siteUrl}/docs/${doc.slug}`,
    lastModified: new Date(doc.lastModified),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Tag landing pages — derived from public docs only so we never expose
  // a tag URL that would 404 or hide all its content.
  const tags = new Set<string>();
  for (const doc of publicDocs) {
    for (const tag of doc.tags) tags.add(tag.toLowerCase());
  }
  const tagPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/docs/tags`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.4,
    },
    ...Array.from(tags).map((tag) => ({
      url: `${siteUrl}/docs/tags/${tag}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];

  return [...staticPages, ...docPages, ...tagPages];
}
