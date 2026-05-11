import { searchClient, DOCS_INDEX } from "./client";
import { getAllDocs, getDocBySlug, stripMdx } from "@/lib/content";
import type { DocPage } from "@/lib/content";

interface MeiliDoc {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  access_tier: string;
  extensions: string[];
  product: string;
  version: string;
  status: string;
  tags: string[];
  owner: string;
  nav_order: number;
  last_verified_at: string | null;
  lastModified: string;
}

export async function indexAllDocs(): Promise<number> {
  const docs = await getAllDocs({ includeContent: true }) as DocPage[];
  const meiliDocs: MeiliDoc[] = [];
  const liveIds = new Set<string>();

  for (const doc of docs) {
    if (doc.status === "draft") continue;
    const id = doc.slug.replace(/\//g, "-");
    liveIds.add(id);
    meiliDocs.push({
      id,
      slug: doc.slug,
      title: doc.title,
      summary: doc.summary,
      content: stripMdx(doc.content).slice(0, 10_000),
      access_tier: doc.access_tier,
      extensions: doc.extensions,
      product: doc.product,
      version: doc.version,
      status: doc.status,
      tags: doc.tags,
      owner: doc.owner,
      nav_order: doc.nav_order,
      last_verified_at: doc.last_verified_at || null,
      lastModified: doc.lastModified,
    });
  }

  const index = searchClient.index(DOCS_INDEX);

  // Find tombstones — docs in the index that no longer exist on disk.
  // Page through the index in batches; the index may have thousands of docs.
  const tombstones: string[] = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const page = await index.getDocuments({
      limit: PAGE,
      offset,
      fields: ["id"],
    });
    for (const d of page.results as { id: string }[]) {
      if (!liveIds.has(d.id)) tombstones.push(d.id);
    }
    if (page.results.length < PAGE) break;
    offset += PAGE;
  }

  if (tombstones.length > 0) {
    console.log(`Removing ${tombstones.length} tombstoned doc(s) from index.`);
    await index.deleteDocuments(tombstones);
  }

  await index.addDocuments(meiliDocs, { primaryKey: "id" });

  console.log(`Indexed ${meiliDocs.length} documents (removed ${tombstones.length}).`);
  return meiliDocs.length;
}

export async function indexDoc(slug: string): Promise<void> {
  const doc = await getDocBySlug(slug.split("/"));
  if (!doc) return;

  const index = searchClient.index(DOCS_INDEX);
  await index.addDocuments([
    {
      id: slug.replace(/\//g, "-"),
      slug,
      title: doc.title,
      summary: doc.summary,
      content: stripMdx(doc.content).slice(0, 10000),
      access_tier: doc.access_tier,
      extensions: doc.extensions,
      product: doc.product,
      version: doc.version,
      status: doc.status,
      tags: doc.tags,
      owner: doc.owner,
      nav_order: doc.nav_order,
      last_verified_at: doc.last_verified_at || null,
      lastModified: doc.lastModified,
    },
  ]);
}

export async function removeDoc(slug: string): Promise<void> {
  const index = searchClient.index(DOCS_INDEX);
  await index.deleteDocument(slug.replace(/\//g, "-"));
}
