import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { frontmatterSchema } from "../src/lib/content/frontmatter";

const contentDir = process.env.CONTENT_DIR || path.join(process.cwd(), "content");

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
}

async function walkDir(dir: string): Promise<string[]> {
  const files: string[] = [];
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
  return files;
}

async function validateFile(filePath: string): Promise<ValidationResult> {
  const relative = path.relative(contentDir, filePath);
  const errors: string[] = [];

  try {
    const raw = await fs.readFile(filePath, "utf-8");

    // Check if file has frontmatter
    if (!raw.startsWith("---")) {
      return { file: relative, valid: false, errors: ["Missing frontmatter"] };
    }

    const { data, content } = matter(raw);

    // Validate frontmatter schema
    const result = frontmatterSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${issue.path.join(".")}: ${issue.message}`);
      }
    }

    // Check for empty content
    if (content.trim().length === 0) {
      errors.push("Empty content body");
    }

    // Check for broken internal links
    const linkPattern = /\[([^\]]+)\]\(\/([^)]+)\)/g;
    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      const linkPath = match[2];
      if (linkPath.startsWith("docs/")) {
        const targetSlug = linkPath.replace(/^docs\//, "");
        const candidates = [
          path.join(contentDir, `${targetSlug}.md`),
          path.join(contentDir, `${targetSlug}.mdx`),
          path.join(contentDir, targetSlug, "index.md"),
          path.join(contentDir, targetSlug, "index.mdx"),
        ];
        const exists = await Promise.any(
          candidates.map((c) => fs.access(c))
        ).catch(() => false);
        if (exists === false) {
          errors.push(`Broken link: ${match[0]} → /${linkPath}`);
        }
      }
    }

    // Check extension format
    if (data.extensions) {
      for (const ext of data.extensions) {
        if (!/^nexus\/[a-z0-9-]+$/.test(ext)) {
          errors.push(`Invalid extension format: "${ext}" (expected nexus/name)`);
        }
      }
    }

    // Check last_verified_at is not in the future
    if (data.last_verified_at) {
      const date = new Date(data.last_verified_at);
      if (date > new Date()) {
        errors.push(`last_verified_at is in the future: ${data.last_verified_at}`);
      }
    }
  } catch (err) {
    errors.push(`Parse error: ${err}`);
  }

  return { file: relative, valid: errors.length === 0, errors };
}

async function main() {
  console.log(`Validating content in: ${contentDir}\n`);

  const files = await walkDir(contentDir);
  const results: ValidationResult[] = [];

  for (const file of files) {
    const result = await validateFile(file);
    results.push(result);
  }

  // Print results
  let passCount = 0;
  let failCount = 0;

  for (const result of results) {
    if (result.valid) {
      console.log(`  ✓ ${result.file}`);
      passCount++;
    } else {
      console.log(`  ✗ ${result.file}`);
      for (const error of result.errors) {
        console.log(`    → ${error}`);
      }
      failCount++;
    }
  }

  console.log(`\n${passCount} passed, ${failCount} failed, ${files.length} total`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
