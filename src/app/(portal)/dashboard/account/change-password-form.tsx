"use client";

import { FormEvent, useState } from "react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { ok: true }
    | { ok: false; error: string }
    | null
  >(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);

    if (newPassword !== confirmPassword) {
      setResult({ ok: false, error: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setResult({ ok: false, error: "New password must be at least 8 characters." });
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (res.ok) {
      setResult({ ok: true });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setResult({ ok: false, error: data.error || "Failed to change password." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label htmlFor="current-password" className="block text-sm font-medium">
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="new-password" className="block text-sm font-medium">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          At least 8 characters.
        </p>
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </div>

      {result && (
        <div
          className={
            result.ok
              ? "rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
              : "rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
          }
        >
          {result.ok ? "Password changed." : result.error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
