import Link from "next/link";
import { Search } from "lucide-react";
import { MegaMenu } from "./mega-menu";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export async function Header() {
  let session = null;
  try {
    session = await auth();
  } catch {
    // Auth unavailable (no database, etc.)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-brand-600">nexus</span>
            <span className="text-sm text-[var(--color-text-secondary)]">
              docs
            </span>
          </Link>

          <MegaMenu />
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:border-brand-400 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search docs...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-[var(--color-border)] px-1.5 font-mono text-[10px] text-[var(--color-text-muted)]">
              ⌘K
            </kbd>
          </Link>
          {session?.user ? (
            <div className="flex items-center gap-3">
              {session.user.tier === "admin" && (
                <Link
                  href="/dashboard"
                  className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  Admin
                </Link>
              )}
              <span className="text-sm text-[var(--color-text-secondary)]">
                {session.user.name || session.user.email}
              </span>
              <SignOutButton />
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
