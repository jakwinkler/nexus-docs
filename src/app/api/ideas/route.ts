import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendEmailDirect } from "@/lib/email/send";
import { ideaSubmittedEmail } from "@/lib/email/templates";

const ideaSchema = z.object({
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(5000),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit("idea-submit", session.user.id, 5, 600);
  if (limited) return NextResponse.json(limited.body, { status: limited.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ideaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { title, description } = parsed.data;

  const idea = await prisma.idea.create({
    data: {
      title,
      description,
      authorId: session.user.id,
    },
  });

  await logAudit(
    "idea.submitted",
    session.user.id,
    { ideaId: idea.id, title },
    request.headers.get("x-forwarded-for") || undefined,
  );

  void notifyAdminsOfIdea({
    authorName: session.user.name ?? session.user.email ?? "Unknown",
    authorEmail: session.user.email ?? "unknown",
    title,
    description,
  });

  return NextResponse.json({ id: idea.id }, { status: 201 });
}

async function notifyAdminsOfIdea(args: {
  authorName: string;
  authorEmail: string;
  title: string;
  description: string;
}): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { tier: "admin" },
      select: { email: true },
    });
    if (admins.length === 0) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docs.example.com";
    const { subject, html } = ideaSubmittedEmail({
      ...args,
      adminUrl: `${siteUrl}/admin/ideas`,
    });

    await Promise.all(
      admins.map((a) => sendEmailDirect({ to: a.email, subject, html })),
    );
  } catch (err) {
    console.error("[idea.submitted] failed to notify admins:", err);
  }
}
