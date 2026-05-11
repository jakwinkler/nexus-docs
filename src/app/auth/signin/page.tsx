"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function GitLabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" />
    </svg>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/";
  // Only allow relative paths (starting with /) to prevent open redirects
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//")
    ? rawCallback
    : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else if (result?.url) {
      window.location.href = result.url;
    }
  }

  return (
    <div className="space-y-4">
      {/* GitLab OAuth */}
      <button
        onClick={() => signIn("gitlab", { callbackUrl })}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FC6D26] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#E24329] transition-colors"
      >
        <GitLabIcon className="h-5 w-5" />
        Sign in with GitLab
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[var(--color-surface-secondary)] px-2 text-[var(--color-text-muted)]">
            or sign in with email
          </span>
        </div>
      </div>

      {/* Credentials form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Signing in..." : "Sign in with email"}
        </button>
      </form>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-brand-600">
            nexus
          </Link>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Sign in to access documentation
          </p>
        </div>

        <Suspense
          fallback={
            <div className="text-center text-sm text-[var(--color-text-muted)]">
              Loading...
            </div>
          }
        >
          <SignInForm />
        </Suspense>

        <p className="text-center text-xs text-[var(--color-text-muted)]">
          <Link href="/" className="hover:text-[var(--color-text-primary)]">
            &larr; Back to docs
          </Link>
        </p>
      </div>
    </div>
  );
}
