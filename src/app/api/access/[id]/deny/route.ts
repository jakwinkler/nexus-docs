import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmailDirect } from "@/lib/email/send";
import { accessDeniedEmail } from "@/lib/email/templates";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  // Use atomic updateMany with status check to prevent TOCTOU race condition
  const result = await prisma.accessRequest.updateMany({
    where: { id, status: "pending" },
    data: {
      status: "denied",
      reviewerId: session.user.id,
      reviewNote: body.note || null,
      reviewedAt: new Date(),
    },
  });

  if (result.count === 0) {
    // Either not found or already processed
    const exists = await prisma.accessRequest.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Request already processed" },
      { status: 409 }
    );
  }

  const accessRequest = await prisma.accessRequest.findUnique({
    where: { id },
  });

  await logAudit(
    "access.denied",
    session.user.id,
    { requestId: id, requesterId: accessRequest?.requesterId },
    request.headers.get("x-forwarded-for") || undefined
  );

  if (accessRequest?.requesterId) {
    void notifyRequesterOfDenial(accessRequest.requesterId, body.note);
  }

  return NextResponse.json(accessRequest);
}

async function notifyRequesterOfDenial(
  requesterId: string,
  reason?: string,
): Promise<void> {
  try {
    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { email: true },
    });
    if (!requester?.email) return;
    const { subject, html } = accessDeniedEmail({ reason });
    await sendEmailDirect({ to: requester.email, subject, html });
  } catch (err) {
    console.error("[access.denied] failed to notify requester:", err);
  }
}
