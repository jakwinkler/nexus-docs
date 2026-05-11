import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getTierRank } from "@/lib/acl";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendEmailDirect } from "@/lib/email/send";
import { negativeFeedbackEmail } from "@/lib/email/templates";

const feedbackSchema = z.object({
  slug: z.string().min(1).max(500),
  helpful: z.boolean(),
  comment: z.string().max(1000).optional().default(""),
});

export async function POST(request: NextRequest) {
  try {
    // Require an authenticated user at client tier or higher — anonymous
    // submissions were getting spammed by bots crawling the site.
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Sign in to leave feedback." },
        { status: 401 },
      );
    }
    const userRank = getTierRank(session.user.tier as string);
    if (userRank < getTierRank("client")) {
      return NextResponse.json(
        { error: "Feedback is available to clients and partners only." },
        { status: 403 },
      );
    }

    const limited = await enforceRateLimit("feedback", session.user.id, 10, 60);
    if (limited) return NextResponse.json(limited.body, { status: limited.status });

    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid feedback data" },
        { status: 400 }
      );
    }

    const { slug, helpful, comment } = parsed.data;

    await prisma.feedback.create({
      data: {
        slug,
        helpful,
        comment,
        userId: session.user.id,
      },
    });

    // Notify admins on negative feedback that includes a comment.
    if (!helpful && comment.trim().length > 0) {
      void notifyAdminsOfNegativeFeedback({
        slug,
        comment,
        authorEmail: session.user.email ?? undefined,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to process feedback" },
      { status: 500 }
    );
  }
}

async function notifyAdminsOfNegativeFeedback(args: {
  slug: string;
  comment: string;
  authorEmail?: string;
}): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { tier: "admin" },
      select: { email: true },
    });
    if (admins.length === 0) return;
    const { subject, html } = negativeFeedbackEmail(args);
    await Promise.all(
      admins.map((a) => sendEmailDirect({ to: a.email, subject, html })),
    );
  } catch (err) {
    console.error("[feedback] failed to notify admins:", err);
  }
}
