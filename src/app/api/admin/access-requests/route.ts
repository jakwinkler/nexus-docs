import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [requests, total] = await Promise.all([
    prisma.accessRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, email: true, name: true, tier: true } },
        reviewer: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.accessRequest.count({ where }),
  ]);

  return NextResponse.json({
    requests,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
