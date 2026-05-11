import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

/**
 * Collect redirects from `redirect_from:` frontmatter on every doc.
 * Runs at build time only — synchronous fs access is fine.
 */
function collectFrontmatterRedirects(): { source: string; destination: string; permanent: boolean }[] {
  const contentDir = process.env.CONTENT_DIR || path.join(process.cwd(), "content");
  if (!fs.existsSync(contentDir)) return [];

  const redirects: { source: string; destination: string; permanent: boolean }[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.mdx?$/.test(entry.name)) {
        try {
          const raw = fs.readFileSync(full, "utf-8");
          const { data } = matter(raw);
          const from: unknown = data.redirect_from;
          if (!Array.isArray(from)) continue;

          // Compute the canonical slug for this file (mirrors loader.ts logic).
          const rel = path.relative(contentDir, full);
          const slug = rel
            .replace(/\\/g, "/")
            .replace(/\/index\.mdx?$/, "")
            .replace(/\.mdx?$/, "");
          const destination = slug ? `/docs/${slug}` : "/docs";

          for (const src of from) {
            if (typeof src !== "string" || !src.trim()) continue;
            // Normalize: ensure leading slash, strip .html/.md suffix.
            let source = src.trim();
            if (!source.startsWith("/")) source = "/" + source;
            source = source.replace(/\.(html|mdx?)$/, "");
            if (source !== destination) {
              redirects.push({ source, destination, permanent: true });
            }
          }
        } catch {
          // Skip unreadable / malformed files — frontmatter validator will catch them.
        }
      }
    }
  }

  walk(contentDir);
  return redirects;
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
  async redirects() {
    const fromFrontmatter = collectFrontmatterRedirects();

    return [
      {
        source: "/portal.example.com",
        destination: "/",
        permanent: true,
      },

      // MkDocs migration — strip .html and .md extensions on /docs/* links
      {
        source: "/docs/:path*.html",
        destination: "/docs/:path*",
        permanent: true,
      },
      {
        source: "/docs/:path*.md",
        destination: "/docs/:path*",
        permanent: true,
      },

      // Old top-level /extensions/* (without /docs/ prefix)
      {
        source: "/extensions/:path*",
        destination: "/docs/extensions/:path*",
        permanent: true,
      },

      // SEO suite — old flat URLs (mkdocs era) → new nested structure.
      // The advisor folder was renamed (advisor-ai → ai-advisor), so it
      // gets a specific rule before the generic seo-* wildcard catch-all.
      {
        source: "/docs/extensions/seo-advisor-ai/:path*",
        destination: "/docs/extensions/seo/ai-advisor/:path*",
        permanent: true,
      },
      {
        source: "/docs/extensions/seo-advisor-ai",
        destination: "/docs/extensions/seo/ai-advisor",
        permanent: true,
      },
      {
        source: "/docs/extensions/seo-:slug/:path*",
        destination: "/docs/extensions/seo/:slug/:path*",
        permanent: true,
      },
      {
        source: "/docs/extensions/seo-:slug",
        destination: "/docs/extensions/seo/:slug",
        permanent: true,
      },

      // Frontmatter-declared redirects (per-doc redirect_from arrays)
      ...fromFrontmatter,

      // /docs/index → /docs (index.md renders at /docs)
      {
        source: "/docs/index",
        destination: "/docs",
        permanent: true,
      },
      {
        source: "/docs/:path*/index",
        destination: "/docs/:path*",
        permanent: true,
      },

      // Trailing slash normalization
      {
        source: "/docs/:path*/",
        destination: "/docs/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/images/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
