import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Audit Log" };
export const dynamic = "force-dynamic";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; event?: string }>;
}) {
  const { page: pageParam, event } = await searchParams;
  const page = parseInt(pageParam || "1", 10);
  const limit = 50;

  const where: Record<string, unknown> = {};
  if (event) where.event = event;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description={`${total} events recorded`}
      />

      <form className="mt-4 flex gap-2" action="/admin/audit-log" method="GET">
        <input
          name="event"
          type="text"
          defaultValue={event}
          placeholder="Filter by event type..."
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Filter
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Event</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Details</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  No audit log entries found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]">
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-[var(--color-surface-secondary)] px-2 py-0.5 text-xs font-mono">
                      {log.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {log.user?.name || log.user?.email || "---"}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-xs text-[var(--color-text-muted)] font-mono">
                    {JSON.stringify(log.data)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {log.ip || "---"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/audit-log?page=${page - 1}${event ? `&event=${event}` : ""}`}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/audit-log?page=${page + 1}${event ? `&event=${event}` : ""}`}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
