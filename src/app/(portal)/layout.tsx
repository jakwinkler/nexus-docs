import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ShieldCheck,
  ScrollText,
  Webhook,
  FileText,
  Settings,
  Search,
  Lightbulb,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/layout/sign-out-button";

const adminNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Invitations", href: "/admin/invitations", icon: UserPlus },
  { label: "Access Requests", href: "/admin/access-requests", icon: ShieldCheck },
  { label: "Ideas", href: "/admin/ideas", icon: Lightbulb },
  { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
  { label: "Content", href: "/admin/content", icon: FileText },
  { label: "Webhooks", href: "/admin/webhooks", icon: Webhook },
  { label: "Search Index", href: "/admin/search", icon: Search },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.tier !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
        <div className="flex h-16 items-center gap-2 border-b border-[var(--color-border)] px-6">
          <Link href="/" className="text-xl font-bold text-brand-600">
            nexus
          </Link>
          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
            ADMIN
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-[var(--color-border)] p-3">
          <Link
            href="/docs"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            ← Back to docs
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-6">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-muted)]">{session.user.email}</span>
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
