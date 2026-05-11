import type { Job } from "bullmq";
import { MeiliSearch } from "meilisearch";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { walkDir, stripMdx } from "@/lib/content/utils";

const DOCS_INDEX = "docs";

interface ReindexData {
  slugs?: string[];
}

export async function processReindex(job: Job<ReindexData>) {
  const meili = new MeiliSearch({
    host: process.env.MEILISEARCH_URL || "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_KEY || "",
  });

  const contentDir = process.env.CONTENT_DIR || path.join(process.cwd(), "content");
  const files = await walkDir(contentDir);

  const docs = [];
  for (const filePath of files) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const { data, content } = matter(raw);
      const relative = path.relative(contentDir, filePath);
      const slug = relative.replace(/\\/g, "/").replace(/\/index\.md$/, "").replace(/\.mdx?$/, "");
      const stat = await fs.stat(filePath);

      if (data.status === "draft") continue;

      docs.push({
        id: slug.replace(/\//g, "-"),
        slug,
        title: data.title || slug,
        summary: data.summary || "",
        content: stripMdx(content).slice(0, 10000),
        access_tier: data.access_tier || "public",
        extensions: data.extensions || [],
        product: data.product || "platform",
        version: data.version || "*",
        status: data.status || "published",
        tags: data.tags || [],
        owner: data.owner || "",
        nav_order: data.nav_order || 0,
        last_verified_at: data.last_verified_at || null,
        lastModified: stat.mtime.toISOString(),
      });
    } catch (err) {
      console.warn(`Skipping ${filePath}:`, err);
    }
  }

  const index = meili.index(DOCS_INDEX);
  await index.addDocuments(docs, { primaryKey: "id" });

  console.log(`Reindex complete: ${docs.length} documents indexed`);
  job.updateProgress(100);

  return { indexed: docs.length };
}
