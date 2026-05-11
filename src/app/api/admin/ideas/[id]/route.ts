import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmailDirect } from "@/lib/email/send";
import { ideaStatusChangeEmail } from "@/lib/email/templates";

const updateSchema = z.object({
  status: z.enum(["new", "reviewing", "planned", "shipped", "declined"]).optional(),
  adminNote: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const before = await prisma.idea.findUnique({
    where: { id },
    include: { author: { select: { email: true } } },
  });
  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const after = await prisma.idea.update({
    where: { id },
    data: parsed.data,
  });

  await logAudit("idea.updated", session.user.id, {
    ideaId: id,
    changes: parsed.data,
  });

  // Email submitter on status changes (skip if no status change or no email).
  if (
    parsed.data.status &&
    parsed.data.status !== before.status &&
    before.author?.email
  ) {
    void (async () => {
      try {
        const { subject, html } = ideaStatusChangeEmail({
          title: after.title,
          status: after.status,
          adminNote: after.adminNote ?? undefined,
        });
        await sendEmailDirect({ to: before.author!.email, subject, html });
      } catch (err) {
        console.error("[idea.updated] failed to email submitter:", err);
      }
    })();
  }

  return NextResponse.json(after);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.idea.delete({ where: { id } });
  await logAudit("idea.deleted", session.user.id, { ideaId: id });

  return NextResponse.json({ success: true });
}
