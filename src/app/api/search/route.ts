import { NextRequest, NextResponse } from "next/server";
import { searchClient, DOCS_INDEX } from "@/lib/meilisearch/client";
import { auth } from "@/lib/auth";
import { getAccessFilter } from "@/lib/acl";
import { prisma } from "@/lib/db";
import type { AccessTier } from "@/lib/content";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";
  const product = searchParams.get("product");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "20", 10), 50));

  if (!q.trim()) {
    return NextResponse.json({ hits: [], totalHits: 0 });
  }

  const session = await auth();
  let userACL: { tier: AccessTier; extensions: string[] } | null = null;

  if (session?.user) {
    const permissions = await prisma.userPermission.findMany({
      where: {
        userId: session.user.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { extension: true },
    });
    userACL = {
      tier: session.user.tier as AccessTier,
      extensions: permissions.map((p) => p.extension),
    };
  }

  const aclFilter = getAccessFilter(userACL);

  // Build filters as an array — MeiliSearch ANDs array elements.
  // Never use string concatenation with user input.
  const filter: (string | string[])[] = [];
  if (aclFilter) filter.push(aclFilter);
  // product is compared via strict equality using MeiliSearch's typed filter.
  // Only allow alphanumeric, hyphens, underscores, and slashes in product slugs.
  if (product && /^[\w\-/]+$/.test(product)) {
    filter.push(`product = "${product}"`);
  }
  filter.push('status != "draft"');

  try {
    const index = searchClient.index(DOCS_INDEX);
    const results = await index.search(q, {
      filter: filter.length > 0 ? filter : undefined,
      limit,
      offset: (page - 1) * limit,
      attributesToHighlight: ["title", "summary", "content"],
      attributesToCrop: ["content"],
      cropLength: 150,
    });

    return NextResponse.json({
      hits: results.hits.map((hit) => ({
        slug: hit.slug,
        title: hit.title,
        summary: hit.summary,
        product: hit.product,
        access_tier: hit.access_tier,
        tags: hit.tags,
        _formatted: hit._formatted,
      })),
      totalHits: results.estimatedTotalHits,
      page,
      limit,
    });
  } catch {
    return NextResponse.json({ hits: [], totalHits: 0, error: "Search unavailable" });
  }
}
