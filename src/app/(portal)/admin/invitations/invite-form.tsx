"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TIERS = ["client", "partner", "admin"] as const;

export function InviteForm({
  knownExtensions: initialExtensions,
}: {
  knownExtensions: string[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]>("client");
  const [message, setMessage] = useState("");
  const [extensions, setExtensions] = useState<string[]>([]);
  const [grantAll, setGrantAll] = useState(false);
  const [allExtensions, setAllExtensions] = useState<string[]>(initialExtensions);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; type: "invited" | "permissions"; acceptUrl?: string; emailSent: boolean }
    | { ok: false; error: string }
    | null
  >(null);

  // Pull the canonical extension list (sourced from content) on mount.
  useEffect(() => {
    fetch("/api/admin/extensions")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.extensions)) {
          // Merge with anything already known (from existing UserPermission rows).
          setAllExtensions((prev) =>
            Array.from(new Set([...prev, ...data.extensions])).sort(),
          );
        }
      })
      .catch(() => {});
  }, []);

  // Default: partners get all extensions ticked automatically (mirrors how
  // ACL treats them at runtime — they bypass extension checks anyway, but
  // we still record the grants so a later downgrade to client doesn't
  // silently lose access). Clients keep manual selection.
  useEffect(() => {
    if (tier === "partner" || tier === "admin") {
      setGrantAll(true);
    } else {
      setGrantAll(false);
    }
  }, [tier]);

  function toggleExtension(ext: string) {
    setExtensions((prev) =>
      prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext],
    );
  }

  // Effective extensions list to send: all of them if grantAll, else manual picks.
  const effectiveExtensions = grantAll ? allExtensions : extensions;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    setSubmitting(true);

    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        tier,
        extensions: effectiveExtensions,
        ...(message ? { message } : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setResult({ ok: false, error: data.error || "Submission failed" });
      return;
    }

    if (data.status === "permissions_granted") {
      setResult({ ok: true, type: "permissions", emailSent: false });
    } else {
      setResult({
        ok: true,
        type: "invited",
        acceptUrl: data.invitation?.acceptUrl,
        emailSent: !!data.emailSent,
      });
    }

    setEmail("");
    setMessage("");
    setExtensions([]);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <h2 className="text-base font-semibold">Invite a new user</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        They&apos;ll receive an email with a secure link to set up their
        account. If the email already belongs to a user, their permissions
        will be updated instead.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="invite-email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="invite-tier" className="block text-sm font-medium">
            Tier
          </label>
          <select
            id="invite-tier"
            value={tier}
            onChange={(e) => setTier(e.target.value as (typeof TIERS)[number])}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">Extensions</label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={grantAll}
              onChange={(e) => setGrantAll(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border)] text-brand-600 focus:ring-brand-500"
            />
            <span>Grant access to all extensions</span>
          </label>
        </div>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {grantAll
            ? `All ${allExtensions.length} extension${allExtensions.length === 1 ? "" : "s"} will be granted.`
            : tier === "client"
              ? "Pick the extensions this user owns. Without any, they'll only see public + generic client docs — not extension-specific configuration or usage pages."
              : "Optional at this tier — partners and admins bypass extension checks. Recorded for the case where they're later downgraded to client."}
        </p>
        <div
          className={`mt-2 flex flex-wrap gap-1.5 ${grantAll ? "pointer-events-none opacity-50" : ""}`}
        >
          {allExtensions.length === 0 ? (
            <span className="text-xs text-[var(--color-text-muted)]">
              No extensions discovered yet.
            </span>
          ) : (
            allExtensions.map((ext) => {
              const isSelected = grantAll || extensions.includes(ext);
              return (
                <button
                  key={ext}
                  type="button"
                  onClick={() => toggleExtension(ext)}
                  disabled={grantAll}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-brand-600 text-white"
                      : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-brand-50 dark:hover:bg-brand-950"
                  }`}
                >
                  {ext.replace(/^nexus\//, "")}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="invite-message" className="block text-sm font-medium">
          Message{" "}
          <span className="text-[var(--color-text-muted)]">(optional)</span>
        </label>
        <textarea
          id="invite-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="A short personal note shown in the email…"
          rows={2}
          maxLength={500}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </div>

      {result && (
        <div className="mt-4">
          {result.ok ? (
            <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
              {result.type === "permissions" ? (
                <p>User already exists — permissions updated.</p>
              ) : result.emailSent ? (
                <p>Invitation sent.</p>
              ) : (
                <div>
                  <p>Invitation created, but email delivery failed.</p>
                  {result.acceptUrl && (
                    <p className="mt-1 break-all font-mono text-xs">
                      Share manually: {result.acceptUrl}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
              {result.error}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={submitting || !email}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send invitation"}
        </button>
      </div>
    </form>
  );
}
