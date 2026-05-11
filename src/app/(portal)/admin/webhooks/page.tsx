import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Webhooks" };
export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const webhooks = await prisma.webhookRegistration.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { deliveries: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description={`${webhooks.length} registered webhooks`}
      />

      <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Event</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">URL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Active</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Deliveries</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Created</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  No webhooks registered
                </td>
              </tr>
            ) : (
              webhooks.map((wh) => (
                <tr key={wh.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]">
                  <td className="px-4 py-3">
                    <span className="rounded bg-[var(--color-surface-secondary)] px-2 py-0.5 text-xs font-mono">
                      {wh.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-[var(--color-text-secondary)] max-w-xs truncate">
                    {wh.url}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${wh.active ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {wh.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{wh._count.deliveries}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {new Date(wh.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
