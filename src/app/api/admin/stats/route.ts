import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllDocs } from "@/lib/content";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [
    totalUsers,
    usersByTier,
    pendingRequests,
    recentViews,
    docs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["tier"], _count: true }),
    prisma.accessRequest.count({ where: { status: "pending" } }),
    prisma.auditLog.count({
      where: {
        event: "page.viewed",
        timestamp: { gte: thirtyDaysAgo },
      },
    }),
    getAllDocs(),
  ]);

  return NextResponse.json({
    users: {
      total: totalUsers,
      byTier: Object.fromEntries(
        usersByTier.map((g) => [g.tier, g._count])
      ),
    },
    documents: {
      total: docs.length,
      published: docs.filter((d) => d.status === "published").length,
      draft: docs.filter((d) => d.status === "draft").length,
    },
    pendingRequests,
    viewsLast30Days: recentViews,
  });
}
