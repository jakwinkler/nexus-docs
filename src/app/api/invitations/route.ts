import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const inviteSchema = z.object({
  email: z.string().email(),
  extensions: z.array(z.string()).default([]),
  tier: z.string().min(1).default("client"),
  message: z.string().optional(),
  expiresInDays: z.number().min(1).max(365).default(30),
});

// POST /api/invitations — Admin sends invitation (or Magento API call)
export async function POST(request: NextRequest) {
  // Auth: either admin session OR valid API key
  const apiKey = request.headers.get("x-api-key");
  const isApiCall = apiKey && apiKey === process.env.INVITATION_API_KEY;

  if (!isApiCall) {
    const session = await auth();
    if (!session?.user || session.user.tier !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, extensions, tier, message, expiresInDays } = parsed.data;

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInDays * 86400000);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { permissions: true },
  });

  if (existingUser) {
    // User exists — just grant the new permissions
    for (const ext of extensions) {
      await prisma.userPermission.upsert({
        where: { userId_extension: { userId: existingUser.id, extension: ext } },
        update: {},
        create: {
          userId: existingUser.id,
          extension: ext,
          grantedBy: isApiCall ? "api" : undefined,
        },
      });
    }

    // Upgrade tier if needed
    const { getTierRank } = await import("@/lib/acl");
    if (getTierRank(tier) > getTierRank(existingUser.tier)) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { tier },
      });
    }

    await logAudit("invitation.existing_user", null, {
      email,
      extensions,
      tier,
    });

    return NextResponse.json({
      status: "permissions_granted",
      message: "User already exists. Permissions have been updated.",
      userId: existingUser.id,
    });
  }

  // Create invitation
  const invitation = await prisma.invitation.create({
    data: {
      email,
      token,
      extensions,
      tier,
      message,
      invitedBy: isApiCall ? "api" : undefined,
      expiresAt,
    },
  });

  // Send invitation email
  const siteUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const acceptUrl = `${siteUrl}/auth/accept-invite?token=${token}`;

  const { sendEmailDirect } = await import("@/lib/email/send");
  const { invitationEmail } = await import("@/lib/email/templates");

  const emailContent = invitationEmail({
    acceptUrl,
    extensions,
    tier,
    message: message || undefined,
    expiresAt,
  });

  const emailSent = await sendEmailDirect({
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
  });

  if (!emailSent) {
    console.error("[Invitations] Failed to send invitation email to", email);
  }

  await logAudit("invitation.sent", null, {
    email,
    extensions,
    tier,
    invitationId: invitation.id,
  });

  return NextResponse.json(
    {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        tier: invitation.tier,
        extensions: invitation.extensions,
        expiresAt: invitation.expiresAt,
        acceptUrl,
      },
      emailSent,
      ...(emailSent ? {} : { emailWarning: "Invitation created but email delivery failed. Share the accept URL manually." }),
    },
    { status: 201 }
  );
}

// GET /api/invitations — Admin lists invitations
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 25;

  const [invitations, total] = await Promise.all([
    prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invitation.count(),
  ]);

  return NextResponse.json({
    invitations,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
