import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const grantSchema = z.object({
  extension: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = grantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const permission = await prisma.userPermission.upsert({
    where: {
      userId_extension: { userId: id, extension: parsed.data.extension },
    },
    update: {},
    create: {
      userId: id,
      extension: parsed.data.extension,
      grantedBy: session.user.id,
    },
  });

  await logAudit("permission.granted", session.user.id, {
    targetUserId: id,
    extension: parsed.data.extension,
  });

  return NextResponse.json(permission, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const extension = searchParams.get("extension");

  if (!extension) {
    return NextResponse.json(
      { error: "Extension parameter required" },
      { status: 400 }
    );
  }

  await prisma.userPermission.delete({
    where: {
      userId_extension: { userId: id, extension },
    },
  });

  await logAudit("permission.revoked", session.user.id, {
    targetUserId: id,
    extension,
  });

  return NextResponse.json({ success: true });
}
