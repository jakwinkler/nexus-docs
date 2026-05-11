const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docs.example.com";
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "nexus Docs";
const companyName = process.env.EMAIL_COMPANY_NAME || "nexus";
const companyAddress =
  process.env.EMAIL_COMPANY_ADDRESS ||
  "nexus sp. z o.o., Wrocław, Poland";
const supportEmail =
  process.env.EMAIL_SUPPORT || "support@example.com";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Wrap email body content with a consistent header + footer.
 * The footer carries the items spam classifiers look for: company name,
 * physical address, support contact, and a clear "why are you getting
 * this" reason. Inline styles only — most clients strip <style> blocks.
 */
function layout(content: string, reason?: string): string {
  const reasonLine = reason
    ? `<p style="margin: 0 0 8px;">${escapeHtml(reason)}</p>`
    : `<p style="margin: 0 0 8px;">You're receiving this because you have an account or pending invitation at ${escapeHtml(siteName)}.</p>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1c1917; line-height: 1.6;">
  <div style="margin-bottom: 32px;">
    <a href="${escapeHtml(siteUrl)}" style="text-decoration: none;">
      <span style="font-size: 24px; font-weight: 700; color: #ea580c;">nexus</span><span style="font-size: 14px; color: #78716c; margin-left: 4px;">docs</span>
    </a>
  </div>
  ${content}
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e7e5e4; font-size: 12px; color: #78716c; line-height: 1.6;">
    ${reasonLine}
    <p style="margin: 0 0 8px;">
      <a href="${escapeHtml(siteUrl)}" style="color: #ea580c; text-decoration: none;">${escapeHtml(siteUrl)}</a>
      &nbsp;·&nbsp;
      <a href="mailto:${escapeHtml(supportEmail)}" style="color: #ea580c; text-decoration: none;">${escapeHtml(supportEmail)}</a>
    </p>
    <p style="margin: 0; color: #a8a29e;">${escapeHtml(companyName)} — ${escapeHtml(companyAddress)}</p>
  </div>
</body>
</html>`;
}

export function invitationEmail(options: {
  acceptUrl: string;
  extensions: string[];
  tier: string;
  message?: string;
  expiresAt: Date;
}): { subject: string; html: string } {
  const { acceptUrl, extensions, tier, message, expiresAt } = options;

  const safeAcceptUrl = escapeHtml(acceptUrl);
  const safeTierLabel = escapeHtml(
    tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );

  const extList =
    extensions.length > 0
      ? `<p style="margin: 16px 0;">You've been granted access to:</p>
         <ul style="padding-left: 20px; color: #44403c;">
           ${extensions
             .map((e) => {
               const label = escapeHtml(
                 e
                   .replace("nexus/", "")
                   .replace(/-/g, " ")
                   .replace(/\b\w/g, (c) => c.toUpperCase())
               );
               return `<li>${label}</li>`;
             })
             .join("")}
         </ul>`
      : "";

  const messageBlock = message
    ? `<p style="background: #fff7ed; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #ea580c; color: #44403c;">${escapeHtml(message)}</p>`
    : "";

  return {
    subject: `You're invited to ${siteName}`,
    html: layout(`
      <h2 style="font-size: 20px; color: #1c1917; margin: 0 0 16px;">You're invited</h2>
      <p>You've been invited to join <strong>${siteName}</strong> as a <strong>${safeTierLabel}</strong>.</p>
      ${extList}
      ${messageBlock}
      <p style="margin: 24px 0;">
        <a href="${safeAcceptUrl}" style="display: inline-block; padding: 12px 28px; background: #ea580c; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Accept Invitation</a>
      </p>
      <p style="font-size: 13px; color: #78716c;">
        This invitation expires on ${escapeHtml(expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))}.
        If you didn't expect this, you can safely ignore it.
      </p>
      <p style="font-size: 12px; color: #a8a29e; margin-top: 24px;">
        Or copy this link: <a href="${safeAcceptUrl}" style="color: #ea580c; word-break: break-all;">${safeAcceptUrl}</a>
      </p>
    `),
  };
}

export function accessApprovedEmail(options: {
  tier: string;
  pagePath?: string;
}): { subject: string; html: string } {
  const { tier, pagePath } = options;
  const tierLabel = escapeHtml(
    tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
  const safeSiteUrl = escapeHtml(siteUrl);

  const pageLink =
    pagePath && /^\/[\w\-/]+$/.test(pagePath)
      ? `<p><a href="${safeSiteUrl}${escapeHtml(pagePath)}" style="color: #ea580c;">View the page you requested →</a></p>`
      : "";

  return {
    subject: `Access granted — ${siteName}`,
    html: layout(`
      <h2 style="font-size: 20px; color: #1c1917; margin: 0 0 16px;">Access Granted</h2>
      <p>Your access request has been approved. You now have <strong>${tierLabel}</strong> access.</p>
      ${pageLink}
      <p style="margin: 24px 0;">
        <a href="${safeSiteUrl}" style="display: inline-block; padding: 12px 28px; background: #ea580c; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Go to Docs</a>
      </p>
    `),
  };
}

export function accessRequestNotificationEmail(options: {
  requesterName: string;
  requesterEmail: string;
  pagePath: string;
  tierRequested: string;
  message?: string;
  adminUrl: string;
}): { subject: string; html: string } {
  const { requesterName, requesterEmail, pagePath, tierRequested, message, adminUrl } = options;
  const safeAdminUrl = escapeHtml(adminUrl);
  const tierLabel = escapeHtml(
    tierRequested.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  );

  const messageBlock = message
    ? `<p style="background: #fff7ed; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #ea580c; color: #44403c;">${escapeHtml(message)}</p>`
    : "";

  return {
    subject: `New access request — ${siteName}`,
    html: layout(`
      <h2 style="font-size: 20px; color: #1c1917; margin: 0 0 16px;">New Access Request</h2>
      <p><strong>${escapeHtml(requesterName)}</strong> (${escapeHtml(requesterEmail)}) requested <strong>${tierLabel}</strong> access.</p>
      <p style="color: #44403c;"><strong>Page:</strong> ${escapeHtml(pagePath)}</p>
      ${messageBlock}
      <p style="margin: 24px 0;">
        <a href="${safeAdminUrl}" style="display: inline-block; padding: 12px 28px; background: #ea580c; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Review Request</a>
      </p>
    `),
  };
}

export function issueReportedEmail(options: {
  reporterName: string;
  reporterEmail: string;
  pagePath: string;
  priority: string;
  description: string;
  issueUrl?: string | null;
}): { subject: string; html: string } {
  const safeSiteUrl = escapeHtml(siteUrl);
  const safePagePath = escapeHtml(options.pagePath);
  const issueLink = options.issueUrl
    ? `<p><a href="${escapeHtml(options.issueUrl)}" style="color: #ea580c;">View tracking issue →</a></p>`
    : "";
  return {
    subject: `Doc issue: ${options.pagePath} — ${siteName}`,
    html: layout(`
      <h2 style="font-size: 20px; color: #1c1917; margin: 0 0 16px;">Doc Issue Reported</h2>
      <p><strong>${escapeHtml(options.reporterName)}</strong> (${escapeHtml(options.reporterEmail)}) reported an issue on
        <a href="${safeSiteUrl}${safePagePath}" style="color: #ea580c;">${safePagePath}</a>
        — priority <strong>${escapeHtml(options.priority)}</strong>.</p>
      <p style="background: #fef2f2; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #dc2626; color: #44403c; white-space: pre-wrap;">${escapeHtml(options.description)}</p>
      ${issueLink}
    `),
  };
}

export function negativeFeedbackEmail(options: {
  slug: string;
  comment: string;
  authorEmail?: string;
}): { subject: string; html: string } {
  const safeSiteUrl = escapeHtml(siteUrl);
  const safeSlug = escapeHtml(options.slug);
  const author = options.authorEmail
    ? `<p style="color: #44403c;"><strong>From:</strong> ${escapeHtml(options.authorEmail)}</p>`
    : `<p style="color: #44403c;"><strong>From:</strong> anonymous</p>`;
  return {
    subject: `Negative feedback on /docs/${options.slug} — ${siteName}`,
    html: layout(`
      <h2 style="font-size: 20px; color: #1c1917; margin: 0 0 16px;">Negative Feedback Received</h2>
      ${author}
      <p style="color: #44403c;"><strong>Page:</strong> <a href="${safeSiteUrl}/docs/${safeSlug}" style="color: #ea580c;">/docs/${safeSlug}</a></p>
      <p style="background: #fef2f2; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #dc2626; color: #44403c; white-space: pre-wrap;">${escapeHtml(options.comment)}</p>
    `),
  };
}

export function staleContentDigestEmail(options: {
  ownerName: string;
  staleDocs: { slug: string; title: string; lastVerified?: string; daysSince: number }[];
}): { subject: string; html: string } {
  const safeSiteUrl = escapeHtml(siteUrl);
  const rows = options.staleDocs
    .map(
      (d) =>
        `<li style="margin-bottom: 8px;"><a href="${safeSiteUrl}/docs/${escapeHtml(d.slug)}" style="color: #ea580c;">${escapeHtml(d.title)}</a> <span style="color: #78716c; font-size: 13px;">— ${d.daysSince} days since last verified</span></li>`,
    )
    .join("");
  return {
    subject: `${options.staleDocs.length} stale doc${options.staleDocs.length === 1 ? "" : "s"} need review — ${siteName}`,
    html: layout(`
      <h2 style="font-size: 20px; color: #1c1917; margin: 0 0 16px;">Stale Content Reminder</h2>
      <p>Hi ${escapeHtml(options.ownerName)}, the following pages are due for a review:</p>
      <ul style="padding-left: 20px;">${rows}</ul>
      <p style="font-size: 13px; color: #78716c;">Pages exceeded their <code>review_interval_days</code> threshold. Update <code>last_verified_at</code> in frontmatter once you&apos;ve confirmed the content is still accurate.</p>
    `),
  };
}

export function ideaSubmittedEmail(options: {
  authorName: string;
  authorEmail: string;
  title: string;
  description: string;
  adminUrl: string;
}): { subject: string; html: string } {
  const safeAdminUrl = escapeHtml(options.adminUrl);
  return {
    subject: `New idea submitted — ${siteName}`,
    html: layout(`
      <h2 style="font-size: 20px; color: #1c1917; margin: 0 0 16px;">New Idea Submitted</h2>
      <p><strong>${escapeHtml(options.authorName)}</strong> (${escapeHtml(options.authorEmail)}) submitted:</p>
      <h3 style="font-size: 16px; color: #1c1917; margin: 16px 0 8px;">${escapeHtml(options.title)}</h3>
      <p style="background: #fafaf9; padding: 12px 16px; border-radius: 8px; color: #44403c; white-space: pre-wrap;">${escapeHtml(options.description)}</p>
      <p style="margin: 24px 0;">
        <a href="${safeAdminUrl}" style="display: inline-block; padding: 12px 28px; background: #ea580c; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Review in Admin</a>
      </p>
    `),
  };
}

export function ideaStatusChangeEmail(options: {
  title: string;
  status: string;
  adminNote?: string;
}): { subject: string; html: string } {
  const statusLabel = escapeHtml(
    options.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  );
  const noteBlock = options.adminNote
    ? `<p style="background: #fff7ed; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #ea580c; color: #44403c;">${escapeHtml(options.adminNote)}</p>`
    : "";
  return {
    subject: `Your idea is now: ${statusLabel} — ${siteName}`,
    html: layout(`
      <h2 style="font-size: 20px; color: #1c1917; margin: 0 0 16px;">Idea Status Update</h2>
      <p>Your idea <strong>${escapeHtml(options.title)}</strong> has been updated to <strong>${statusLabel}</strong>.</p>
      ${noteBlock}
      <p>Thanks for helping shape the product.</p>
    `),
  };
}

export function accessDeniedEmail(options: {
  reason?: string;
}): { subject: string; html: string } {
  const reasonBlock = options.reason
    ? `<p style="background: #fef2f2; padding: 12px 16px; border-radius: 8px; color: #991b1b;">${escapeHtml(options.reason)}</p>`
    : "";

  return {
    subject: `Access request update — ${siteName}`,
    html: layout(`
      <h2 style="font-size: 20px; color: #1c1917; margin: 0 0 16px;">Access Request Update</h2>
      <p>Your access request has been reviewed and was not approved at this time.</p>
      ${reasonBlock}
      <p>If you have questions, please contact <a href="mailto:support@example.com" style="color: #ea580c;">support@example.com</a>.</p>
    `),
  };
}
