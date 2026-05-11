import fs from "fs/promises";
import path from "path";

/**
 * Recursively walk a directory and return paths of all .md and .mdx files.
 */
export async function walkDir(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await fs.readdir(dir);
    for (const name of entries) {
      const fullPath = path.join(dir, name);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        files.push(...(await walkDir(fullPath)));
      } else if (/\.mdx?$/.test(name)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or is unreadable
  }
  return files;
}

/**
 * Strip MDX/Markdown syntax from content to produce plain text for indexing.
 */
export function stripMdx(content: string): string {
  return content
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/<[^>]+>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/[#*_~\[\]()>|]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
