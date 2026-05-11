import { enqueueEmail } from "@/lib/queue/producers";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Strip HTML to a readable plain-text body. Most clients hide the text
 * part, but spam filters look at the html/text ratio — sending HTML
 * with no text alternative is one of the strongest "looks like a bot"
 * signals there is. This isn't fancy — just enough to be reasonable.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Headers added to every transactional email so receivers (and spam
 * filters) understand what they're looking at:
 * - Auto-Submitted: marks this as not a human-typed message
 * - Precedence: bulk hint to prevent vacation-responder loops
 * - X-Auto-Response-Suppress: tells Outlook/Exchange not to auto-reply
 */
const TRANSACTIONAL_HEADERS = {
  "Auto-Submitted": "auto-generated",
  Precedence: "bulk",
  "X-Auto-Response-Suppress": "OOF, AutoReply",
};

/**
 * Send an email via the configured transport.
 * Priority: Resend API → SMTP → console log (dev fallback)
 */
export async function sendEmailDirect(options: EmailOptions): Promise<boolean> {
  const { to, subject, html } = options;

  const text = htmlToText(html);
  const from = process.env.EMAIL_FROM || "no-reply@docs.example.com";

  // Option 1: Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
        headers: TRANSACTIONAL_HEADERS,
      });
      return true;
    } catch (err) {
      console.error("Resend failed, trying SMTP:", err);
    }
  }

  // Option 2: SMTP (local server, Mailpit, or external)
  if (process.env.SMTP_HOST) {
    try {
      const nodemailer = await import("nodemailer");
      // Hosts we connect to over the docker bridge (host.docker.internal,
      // mailpit, etc.) often present a certificate that doesn't match the
      // hostname we used to reach them — the TLS hop is on a private
      // network and the cert mismatch isn't a real risk. Default to
      // tolerating it; flip SMTP_TLS_REJECT_UNAUTHORIZED=true if you're
      // sending through a real public relay.
      const rejectUnauthorized =
        process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "true";
      const transport = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "25", 10),
        secure: process.env.SMTP_SECURE === "true",
        tls: { rejectUnauthorized },
        ...(process.env.SMTP_USER && {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || "",
          },
        }),
      });

      await transport.sendMail({
        from,
        to,
        subject,
        html,
        text,
        headers: TRANSACTIONAL_HEADERS,
      });
      return true;
    } catch (err) {
      console.error("SMTP failed:", err);
    }
  }

  // Option 3: Dev fallback — log to console
  console.log(`\n=== EMAIL (no transport configured) ===`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${html.substring(0, 200)}...`);
  console.log(`=== END EMAIL ===\n`);
  return false;
}

/**
 * Queue an email for background sending via the worker.
 */
export async function sendEmail(
  to: string,
  template: string,
  data: Record<string, unknown>
): Promise<void> {
  await enqueueEmail(to, template, data);
}
