import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { prisma } from "@/lib/db";
import {
  ChangeTierForm,
  GrantPermissionForm,
  RevokePermissionButton,
  SendInviteForm,
} from "./actions";

export const metadata: Metadata = { title: "User Detail" };
export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      permissions: { orderBy: { grantedAt: "desc" } },
      accessRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { reviewer: { select: { name: true, email: true } } },
      },
    },
  });

  if (!user) notFound();

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    denied: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div>
      <PageHeader
        title={user.name || user.email}
        description={user.email}
        actions={
          <Link
            href="/admin/users"
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-secondary)]"
          >
            &larr; Back
          </Link>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* User Info */}
        <div className="rounded-lg border border-[var(--color-border)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
            User Info
          </h2>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-xs text-[var(--color-text-muted)]">Tier</dt>
              <dd className="mt-1">
                <ChangeTierForm userId={user.id} currentTier={user.tier} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-muted)]">Magento ID</dt>
              <dd className="text-sm">{user.magentoId || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-muted)]">Joined</dt>
              <dd className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>

          {/* Send Invitation */}
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <SendInviteForm email={user.email} />
          </div>
        </div>

        {/* Permissions */}
        <div className="rounded-lg border border-[var(--color-border)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
            Extension Permissions
          </h2>
          {user.permissions.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">No permissions granted</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {user.permissions.map((perm) => (
                <li key={perm.id} className="flex items-center justify-between rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2">
                  <div>
                    <span className="text-sm font-mono">{perm.extension}</span>
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                      {new Date(perm.grantedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <RevokePermissionButton userId={user.id} extension={perm.extension} />
                </li>
              ))}
            </ul>
          )}

          <GrantPermissionForm
            userId={user.id}
            existingExtensions={user.permissions.map((p) => p.extension)}
          />
        </div>
      </div>

      {/* Access Requests */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
          Access Request History
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">Page</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">Tier</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">Date</th>
              </tr>
            </thead>
            <tbody>
              {user.accessRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                    No access requests
                  </td>
                </tr>
              ) : (
              user.accessRequests.map((req) => (
                <tr key={req.id} className="border-b border-[var(--color-border)]">
                  <td className="px-4 py-2 font-mono text-xs">{req.pagePath}</td>
                  <td className="px-4 py-2">{req.tierRequested}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[req.status]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
