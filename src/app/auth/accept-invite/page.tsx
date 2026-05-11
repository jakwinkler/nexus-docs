"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<{
    email: string;
    extensions: string[];
  } | null>(null);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Missing invitation token");
      setValidating(false);
      return;
    }

    fetch(`/api/invitations/validate?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data);
        }
        setValidating(false);
      })
      .catch(() => {
        setError("Failed to validate invitation");
        setValidating(false);
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to accept invitation");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/auth/signin"), 2000);
  }

  if (validating) {
    return (
      <div className="text-center text-sm text-[var(--color-text-muted)]">
        Validating invitation...
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Account created! Redirecting to sign in...
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
        <Link
          href="/"
          className="block text-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          &larr; Back to docs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invitation && (
        <div className="rounded-lg bg-brand-50 p-3 text-sm dark:bg-brand-950">
          <p className="text-[var(--color-text-primary)]">
            Invitation for <strong>{invitation.email}</strong>
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Access to: {invitation.extensions.map((e) => e.replace("nexus/", "")).join(", ")}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text-secondary)]">
            Your name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-secondary)]">
            Create password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-[var(--color-text-secondary)]">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Repeat password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating account..." : "Accept & Create Account"}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-brand-600">
            nexus
          </Link>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Accept your invitation
          </p>
        </div>

        <Suspense
          fallback={
            <div className="text-center text-sm text-[var(--color-text-muted)]">
              Loading...
            </div>
          }
        >
          <AcceptInviteForm />
        </Suspense>
      </div>
    </div>
  );
}
