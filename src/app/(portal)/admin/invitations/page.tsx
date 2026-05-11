import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { prisma } from "@/lib/db";
import { InviteForm } from "./invite-form";
import { RevokeButton } from "./actions";

export const metadata: Metadata = { title: "Invitations" };
export const dynamic = "force-dynamic";

function statusOf(inv: { acceptedAt: Date | null; expiresAt: Date }): {
  label: string;
  className: string;
} {
  if (inv.acceptedAt) {
    return {
      label: "accepted",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    };
  }
  if (inv.expiresAt < new Date()) {
    return {
      label: "expired",
      className:
        "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
    };
  }
  return {
    label: "pending",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  };
}

export default async function InvitationsPage() {
  const [invitations, extensionsResult] = await Promise.all([
    prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    // Source the same extension list /api/admin/extensions uses, server-side
    prisma.userPermission.findMany({
      distinct: ["extension"],
      select: { extension: true },
    }),
  ]);

  // Best-effort extension list — if no permissions exist yet, fall back to known products from content
  const extensions = Array.from(
    new Set(extensionsResult.map((r) => r.extension)),
  ).sort();

  return (
    <div>
      <PageHeader
        title="Invitations"
        description="Invite new users to the docs and grant extension access"
      />

      <div className="mt-6">
        <InviteForm knownExtensions={extensions} />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">
          Recent invitations ({invitations.length})
        </h2>

        <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-muted)]">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-muted)]">
                  Tier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-muted)]">
                  Extensions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-muted)]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-muted)]">
                  Sent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-muted)]">
                  Expires
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-[var(--color-text-muted)]"
                  >
                    No invitations sent yet.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => {
                  const status = statusOf(inv);
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"
                    >
                      <td className="px-4 py-3 font-medium">{inv.email}</td>
                      <td className="px-4 py-3">{inv.tier}</td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                        {inv.extensions.length === 0
                          ? "—"
                          : inv.extensions.join(", ")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {status.label === "pending" && (
                          <RevokeButton invitationId={inv.id} />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
