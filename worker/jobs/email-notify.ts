import type { Job } from "bullmq";

interface EmailData {
  to: string;
  template: string;
  data: Record<string, unknown>;
}

export async function processEmail(job: Job<EmailData>) {
  const { to, template, data } = job.data;

  // Try Resend first
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject = getSubject(template, data);
    const html = renderTemplate(template, data);

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "no-reply@example.com",
      to,
      subject,
      html,
    });

    console.log(`Email sent via Resend: ${template} → ${to}`);
    return { provider: "resend", to, template };
  }

  // Fallback: log
  console.log(`Email (no provider): ${template} → ${to}`, data);
  return { provider: "none", to, template };
}

function getSubject(
  template: string,
  data: Record<string, unknown>
): string {
  switch (template) {
    case "access-request":
      return `New access request from ${data.userName || "a user"}`;
    case "access-approved":
      return "Your access request has been approved";
    case "access-denied":
      return "Your access request has been denied";
    default:
      return `Notification: ${template}`;
  }
}

function escapeHtml(unsafe: unknown): string {
  return String(unsafe ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTemplate(
  template: string,
  data: Record<string, unknown>
): string {
  switch (template) {
    case "access-request":
      return `
        <h2>New Access Request</h2>
        <p><strong>${escapeHtml(data.userName)}</strong> (${escapeHtml(data.userEmail)}) has requested <strong>${escapeHtml(data.tierRequested)}</strong> access.</p>
        <p>Page: ${escapeHtml(data.pagePath)}</p>
        ${data.message ? `<p>Message: ${escapeHtml(data.message)}</p>` : ""}
        <p><a href="${escapeHtml(data.approveUrl)}">Approve</a> | <a href="${escapeHtml(data.denyUrl)}">Deny</a></p>
      `;
    case "access-approved":
      return `
        <h2>Access Granted</h2>
        <p>Your request for ${escapeHtml(data.tierRequested)} access has been approved.</p>
        <p>You can now access: <a href="${escapeHtml(data.pagePath)}">${escapeHtml(data.pagePath)}</a></p>
      `;
    case "access-denied":
      return `
        <h2>Access Request Denied</h2>
        <p>Your request for ${escapeHtml(data.tierRequested)} access has been denied.</p>
        ${data.reviewNote ? `<p>Reason: ${escapeHtml(data.reviewNote)}</p>` : ""}
      `;
    default:
      return `<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
  }
}
