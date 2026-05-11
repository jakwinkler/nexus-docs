import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  const envVars = [
    { key: "DATABASE_URL", set: !!process.env.DATABASE_URL, description: "PostgreSQL connection string" },
    { key: "AUTH_SECRET", set: !!process.env.AUTH_SECRET, description: "Auth.js secret for JWT signing" },
    { key: "NEXTAUTH_URL", set: !!process.env.NEXTAUTH_URL, description: "Canonical URL of the application" },
    { key: "MEILISEARCH_URL", set: !!process.env.MEILISEARCH_URL, description: "Meilisearch instance URL" },
    { key: "MEILISEARCH_KEY", set: !!process.env.MEILISEARCH_KEY, description: "Meilisearch master/admin key" },
    { key: "REDIS_URL", set: !!process.env.REDIS_URL, description: "Redis connection for BullMQ workers" },
    { key: "RESEND_API_KEY", set: !!process.env.RESEND_API_KEY, description: "Resend API key for email notifications" },
    { key: "WEBHOOK_SECRET", set: !!process.env.WEBHOOK_SECRET, description: "Secret for GitLab webhook verification" },
    { key: "GITLAB_URL", set: !!process.env.GITLAB_URL, description: "GitLab instance URL" },
    { key: "GITLAB_TOKEN", set: !!process.env.GITLAB_TOKEN, description: "GitLab private access token" },
    { key: "GITLAB_CONTENT_PROJECT_ID", set: !!process.env.GITLAB_CONTENT_PROJECT_ID, description: "GitLab project ID for issue creation" },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Application configuration and environment status"
      />

      <div className="mt-6 rounded-lg border border-[var(--color-border)]">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3">
          <h2 className="text-sm font-medium">Environment Variables</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Variable</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Description</th>
            </tr>
          </thead>
          <tbody>
            {envVars.map((v) => (
              <tr key={v.key} className="border-b border-[var(--color-border)]">
                <td className="px-4 py-3 font-mono text-xs">{v.key}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      v.set
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    }`}
                  >
                    {v.set ? "Set" : "Missing"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{v.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
