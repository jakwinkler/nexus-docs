import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendEmailDirect } from "@/lib/email/send";
import { accessRequestNotificationEmail } from "@/lib/email/templates";

const requestSchema = z.object({
  pagePath: z.string().min(1),
  tierRequested: z.enum(["client", "partner", "admin"]),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit("access-request", session.user.id, 5, 300);
  if (limited) return NextResponse.json(limited.body, { status: limited.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { pagePath, tierRequested, message } = parsed.data;

  const existing = await prisma.accessRequest.findFirst({
    where: {
      requesterId: session.user.id,
      pagePath,
      status: "pending",
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending request for this page" },
      { status: 409 }
    );
  }

  const accessRequest = await prisma.accessRequest.create({
    data: {
      requesterId: session.user.id,
      pagePath,
      tierRequested,
      message,
    },
  });

  await logAudit(
    "access.requested",
    session.user.id,
    { pagePath, tierRequested, requestId: accessRequest.id },
    request.headers.get("x-forwarded-for") || undefined
  );

  // Notify all admins. Failures are logged but don't fail the request.
  void notifyAdminsOfAccessRequest({
    requesterName: session.user.name ?? session.user.email ?? "Unknown",
    requesterEmail: session.user.email ?? "unknown",
    pagePath,
    tierRequested,
    message,
  });

  return NextResponse.json(accessRequest, { status: 201 });
}

async function notifyAdminsOfAccessRequest(args: {
  requesterName: string;
  requesterEmail: string;
  pagePath: string;
  tierRequested: string;
  message?: string;
}): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { tier: "admin" },
      select: { email: true },
    });
    if (admins.length === 0) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docs.example.com";
    const { subject, html } = accessRequestNotificationEmail({
      ...args,
      adminUrl: `${siteUrl}/admin/access-requests`,
    });

    await Promise.all(
      admins.map((a) => sendEmailDirect({ to: a.email, subject, html })),
    );
  } catch (err) {
    console.error("[access.request] failed to notify admins:", err);
  }
}
