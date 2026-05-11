import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit("inv-validate", getClientIp(request), 20, 60);
  if (limited) return NextResponse.json(limited.body, { status: limited.status });

  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  }

  if (invitation.acceptedAt) {
    return NextResponse.json(
      { error: "This invitation has already been used" },
      { status: 409 }
    );
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This invitation has expired" },
      { status: 410 }
    );
  }

  return NextResponse.json({
    email: invitation.email,
    extensions: invitation.extensions,
    tier: invitation.tier,
    expiresAt: invitation.expiresAt.toISOString(),
  });
}
