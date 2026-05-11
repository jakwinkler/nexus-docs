import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTierRank } from "@/lib/acl";
import { logAudit } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendEmailDirect } from "@/lib/email/send";
import { issueReportedEmail } from "@/lib/email/templates";

const issueSchema = z.object({
  pagePath: z.string().min(1),
  description: z.string().min(10),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Restrict to client tier or higher — keeps the report-issue surface
  // free of bot/spam submissions from drive-by visitors.
  const userRank = getTierRank(session.user.tier as string);
  if (userRank < getTierRank("client")) {
    return NextResponse.json(
      { error: "Issue reporting is available to clients and partners only." },
      { status: 403 },
    );
  }

  const limited = await enforceRateLimit("issue", session.user.id, 5, 300);
  if (limited) return NextResponse.json(limited.body, { status: limited.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = issueSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { pagePath, description, priority } = parsed.data;

  let issueUrl: string | null = null;
  let branchName: string | null = null;

  // Try GitLab integration
  if (process.env.GITLAB_TOKEN && process.env.GITLAB_CONTENT_PROJECT_ID) {
    try {
      const { createIssue, createBranch } = await import("@/lib/gitlab/client");

      const title = `[Docs] Issue on ${pagePath} (${priority})`;
      const issueBody = `**Reported by:** ${session.user.name || session.user.email}\n**Page:** ${pagePath}\n**Priority:** ${priority}\n\n${description}`;

      const result = await createIssue(title, issueBody, [
        "documentation",
        `priority::${priority}`,
      ]);

      issueUrl = result.issueUrl;

      const slug = pagePath.replace(/[^a-z0-9]/gi, "-").replace(/-+/g, "-");
      branchName = await createBranch(
        `docs/issue-${result.issueId}-${slug}`,
        process.env.GITLAB_CONTENT_BRANCH || "main"
      );
    } catch (err) {
      console.error("GitLab integration failed:", err);
    }
  }

  await logAudit("issue.reported", session.user.id, {
    pagePath,
    description,
    priority,
    issueUrl,
    branchName,
  });

  void notifyAdminsOfIssue({
    reporterName: session.user.name ?? session.user.email ?? "Unknown",
    reporterEmail: session.user.email ?? "unknown",
    pagePath,
    priority,
    description,
    issueUrl,
  });

  return NextResponse.json(
    {
      message: "Issue reported successfully",
      pagePath,
      priority,
      issueUrl,
      branchName,
    },
    { status: 201 }
  );
}

async function notifyAdminsOfIssue(args: {
  reporterName: string;
  reporterEmail: string;
  pagePath: string;
  priority: string;
  description: string;
  issueUrl: string | null;
}): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { tier: "admin" },
      select: { email: true },
    });
    if (admins.length === 0) return;
    const { subject, html } = issueReportedEmail(args);
    await Promise.all(
      admins.map((a) => sendEmailDirect({ to: a.email, subject, html })),
    );
  } catch (err) {
    console.error("[issue.reported] failed to notify admins:", err);
  }
}
