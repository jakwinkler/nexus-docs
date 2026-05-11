import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/dashboard/account");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      tier: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  const hasPassword = !!user?.passwordHash;

  return (
    <div>
      <PageHeader title="Account" description="Your account settings" />

      <div className="mt-6 space-y-6">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-base font-semibold">Profile</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--color-text-muted)]">Name</dt>
              <dd className="mt-0.5">{user?.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Email</dt>
              <dd className="mt-0.5">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Tier</dt>
              <dd className="mt-0.5">{user?.tier}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Member since</dt>
              <dd className="mt-0.5">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-base font-semibold">Password</h2>
          {hasPassword ? (
            <>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Change the password you use to sign in.
              </p>
              <div className="mt-4">
                <ChangePasswordForm />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              This account signs in via single sign-on (GitLab) — there&apos;s
              no password to change here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
