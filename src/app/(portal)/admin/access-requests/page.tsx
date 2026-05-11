import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { prisma } from "@/lib/db";
import { AccessRequestActions } from "./actions";

export const metadata: Metadata = { title: "Access Requests" };
export const dynamic = "force-dynamic";

export default async function AccessRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageParam, status } = await searchParams;
  const page = parseInt(pageParam || "1", 10);
  const limit = 25;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [requests, total] = await Promise.all([
    prisma.accessRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, email: true, name: true, tier: true } },
        reviewer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.accessRequest.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    denied: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div>
      <PageHeader
        title="Access Requests"
        description={`${total} total requests`}
      />

      {/* Filter */}
      <form className="mt-4 flex gap-2" action="/admin/access-requests" method="GET">
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
        </select>
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
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Requester</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Page</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Tier</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  No access requests found
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${req.requester.id}`} className="text-brand-600 hover:underline">
                      {req.requester.name || req.requester.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{req.pagePath}</td>
                  <td className="px-4 py-3">{req.tierRequested}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[req.status]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {req.status === "pending" && (
                      <AccessRequestActions requestId={req.id} />
                    )}
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
              href={`/admin/access-requests?page=${page - 1}${status ? `&status=${status}` : ""}`}
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
              href={`/admin/access-requests?page=${page + 1}${status ? `&status=${status}` : ""}`}
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
