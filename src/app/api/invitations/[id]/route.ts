import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Only allow revoking unaccepted invitations
  const result = await prisma.invitation.deleteMany({
    where: { id, acceptedAt: null },
  });

  if (result.count === 0) {
    const exists = await prisma.invitation.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Cannot revoke an accepted invitation" },
      { status: 409 },
    );
  }

  await logAudit("invitation.revoked", session.user.id, { invitationId: id });

  return NextResponse.json({ success: true });
}
