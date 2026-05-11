import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { validateFrontmatter } from "./frontmatter";
import { walkDir } from "./utils";
import type { DocMeta, DocPage } from "./types";

let docCache: Map<string, DocMeta> | null = null;
let cacheTimestamp = 0;

// No cache in dev — files change constantly. 5 minutes in production.
const CACHE_TTL_MS =
  process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 0;

function isCacheValid(): boolean {
  if (CACHE_TTL_MS === 0) return false;
  return docCache !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

export function getContentDir(): string {
  return process.env.CONTENT_DIR || path.join(process.cwd(), "content");
}

function slugFromFilePath(filePath: string, contentDir: string): string {
  const relative = path.relative(contentDir, filePath);
  return relative
    .replace(/\\/g, "/")
    .replace(/\/index\.md$/, "")
    .replace(/^index\.md$/, "")
    .replace(/\.mdx?$/, "");
}

async function findDocFile(slugParts: string[]): Promise<string | null> {
  // Reject any slug segment containing path traversal characters
  if (slugParts.some((part) => part === ".." || part === "." || part.includes("/"))) {
    return null;
  }

  const contentDir = path.resolve(getContentDir());
  const slugPath = slugParts.join("/");

  const candidates = [
    path.join(contentDir, `${slugPath}.md`),
    path.join(contentDir, `${slugPath}.mdx`),
    path.join(contentDir, slugPath, "index.md"),
    path.join(contentDir, slugPath, "index.mdx"),
  ];

  for (const candidate of candidates) {
    // Ensure resolved path stays within the content directory
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(contentDir + path.sep) && resolved !== contentDir) {
      return null;
    }

    try {
      await fs.access(resolved);
      return resolved;
    } catch {
      continue;
    }
  }

  return null;
}

export async function getDocBySlug(
  slugParts: string[]
): Promise<DocPage | null> {
  const filePath = await findDocFile(slugParts);
  if (!filePath) return null;

  const contentDir = getContentDir();
  const raw = await fs.readFile(filePath, "utf-8");
  const { data, content } = matter(raw);
  const stat = await fs.stat(filePath);
  const slug = slugFromFilePath(filePath, contentDir);

  const frontmatter = validateFrontmatter(data);

  return {
    ...frontmatter,
    slug,
    content,
    lastModified: stat.mtime.toISOString(),
  };
}

export async function getAllDocs(options?: { includeContent?: boolean }): Promise<DocMeta[]> {
  if (!options?.includeContent && isCacheValid()) return Array.from(docCache!.values());

  const contentDir = getContentDir();
  const files = await walkDir(contentDir);
  const docs: DocMeta[] = [];

  for (const filePath of files) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const { data, content } = matter(raw);
      const stat = await fs.stat(filePath);
      const slug = slugFromFilePath(filePath, contentDir);
      const frontmatter = validateFrontmatter(data);

      if (options?.includeContent) {
        docs.push({
          ...frontmatter,
          slug,
          lastModified: stat.mtime.toISOString(),
          content,
        } as DocPage);
      } else {
        docs.push({
          ...frontmatter,
          slug,
          lastModified: stat.mtime.toISOString(),
        });
      }
    } catch (err) {
      console.warn(`Skipping ${filePath}: ${err}`);
    }
  }

  if (!options?.includeContent) {
    docCache = new Map(docs.map((d) => [d.slug, d]));
    cacheTimestamp = Date.now();
  }
  return docs;
}

export async function getDocsByProduct(product: string): Promise<DocMeta[]> {
  const all = await getAllDocs();
  return all.filter((d) => d.product === product);
}

export function invalidateCache(): void {
  docCache = null;
  cacheTimestamp = 0;
}
