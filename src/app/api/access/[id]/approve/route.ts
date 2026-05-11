import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getDocBySlug } from "@/lib/content";
import { sendEmailDirect } from "@/lib/email/send";
import { accessApprovedEmail } from "@/lib/email/templates";

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
      status: "approved",
      reviewerId: session.user.id,
      reviewNote: body.note || null,
      reviewedAt: new Date(),
    },
  });

  if (result.count === 0) {
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

  if (!accessRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Apply permissions based on requested tier
  if (
    accessRequest.tierRequested === "partner" ||
    accessRequest.tierRequested === "admin"
  ) {
    // Tier upgrade — partners/admins get access to everything
    await prisma.user.update({
      where: { id: accessRequest.requesterId },
      data: { tier: accessRequest.tierRequested },
    });
  } else if (accessRequest.tierRequested === "client") {
    // Client tier — grant extension-level permissions.
    // Mirror checkExtensionAccess: a doc may be gated by either explicit
    // extensions[] OR its product field (when product != "platform").
    const pagePath = accessRequest.pagePath.replace(/^\/docs\//, "");
    const slugParts = pagePath.split("/");
    const doc = await getDocBySlug(slugParts);

    const grants = new Set<string>();
    if (doc) {
      for (const ext of doc.extensions ?? []) grants.add(ext);
      if (doc.product && doc.product !== "platform") grants.add(doc.product);
    }

    for (const extension of grants) {
      await prisma.userPermission.upsert({
        where: {
          userId_extension: {
            userId: accessRequest.requesterId,
            extension,
          },
        },
        create: {
          userId: accessRequest.requesterId,
          extension,
          grantedBy: session.user.id,
        },
        update: {
          grantedBy: session.user.id,
        },
      });
    }

    // Also ensure user is at least client tier
    const user = await prisma.user.findUnique({
      where: { id: accessRequest.requesterId },
    });
    if (user && user.tier === "public") {
      await prisma.user.update({
        where: { id: accessRequest.requesterId },
        data: { tier: "client" },
      });
    }
  }

  await logAudit(
    "access.approved",
    session.user.id,
    {
      requestId: id,
      requesterId: accessRequest.requesterId,
      tierRequested: accessRequest.tierRequested,
      pagePath: accessRequest.pagePath,
    },
    request.headers.get("x-forwarded-for") || undefined
  );

  void notifyRequesterOfApproval(accessRequest.requesterId, {
    tier: accessRequest.tierRequested,
    pagePath: accessRequest.pagePath,
  });

  return NextResponse.json(accessRequest);
}

async function notifyRequesterOfApproval(
  requesterId: string,
  args: { tier: string; pagePath: string },
): Promise<void> {
  try {
    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { email: true },
    });
    if (!requester?.email) return;
    const { subject, html } = accessApprovedEmail(args);
    await sendEmailDirect({ to: requester.email, subject, html });
  } catch (err) {
    console.error("[access.approved] failed to notify requester:", err);
  }
}
