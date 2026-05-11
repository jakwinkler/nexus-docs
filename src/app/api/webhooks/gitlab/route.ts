import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logAudit } from "@/lib/audit";
import { enqueueContentSync } from "@/lib/queue/producers";

export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Hash both strings to equal-length SHA-256 digests so length differences
  // cannot leak via early return from a byte-length check.
  const token = request.headers.get("x-gitlab-token") || "";
  const tokenDigest = crypto.createHash("sha256").update(token).digest();
  const secretDigest = crypto.createHash("sha256").update(secret).digest();
  if (!crypto.timingSafeEqual(tokenDigest, secretDigest)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const event = request.headers.get("x-gitlab-event");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await logAudit("webhook.received", null, {
    source: "gitlab",
    event,
    ref: body.ref,
    project: body.project?.name,
  });

  // Handle merge request merged to main — trigger content sync
  if (event === "Merge Request Hook" && body.object_attributes?.state === "merged") {
    const targetBranch = body.object_attributes?.target_branch;
    const contentBranch = process.env.GITLAB_CONTENT_BRANCH || "main";

    if (targetBranch === contentBranch) {
      await enqueueContentSync({ fullSync: true });

      await logAudit("webhook.content-sync-triggered", null, {
        mergeRequest: body.object_attributes?.iid,
      });
    }
  }

  // Handle push to content branch
  if (event === "Push Hook") {
    const ref = body.ref;
    const contentBranch = process.env.GITLAB_CONTENT_BRANCH || "main";

    if (ref === `refs/heads/${contentBranch}`) {
      await enqueueContentSync({ fullSync: false });

      await logAudit("webhook.push-to-content", null, {
        commits: body.total_commits_count,
      });
    }
  }

  return NextResponse.json({ received: true });
}
