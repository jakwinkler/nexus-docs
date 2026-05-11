"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Send } from "lucide-react";

// ─── Change Tier ─────────────────────────────────────

export function ChangeTierForm({
  userId,
  currentTier,
}: {
  userId: string;
  currentTier: string;
}) {
  const router = useRouter();
  const [tier, setTier] = useState(currentTier);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (tier === currentTier) return;
    setLoading(true);

    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value)}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
      >
        <option value="public">public</option>
        <option value="client">client</option>
        <option value="partner">partner</option>
        <option value="admin">admin</option>
      </select>
      {tier !== currentTier && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      )}
    </div>
  );
}

// ─── Grant Permission ────────────────────────────────

export function GrantPermissionForm({
  userId,
  existingExtensions,
}: {
  userId: string;
  existingExtensions: string[];
}) {
  const router = useRouter();
  const [extension, setExtension] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [allExtensions, setAllExtensions] = useState<string[]>([]);

  // Fetch available extensions from content files
  useEffect(() => {
    if (showForm && allExtensions.length === 0) {
      fetch("/api/admin/extensions")
        .then((res) => res.json())
        .then((data) => setAllExtensions(data.extensions || []))
        .catch(() => {});
    }
  }, [showForm, allExtensions.length]);

  const available = allExtensions.filter(
    (e) => !existingExtensions.includes(e)
  );

  async function handleGrant() {
    if (!extension) return;
    setLoading(true);

    await fetch(`/api/admin/users/${userId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extension }),
    });

    setExtension("");
    setLoading(false);
    setShowForm(false);
    router.refresh();
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="mt-3 flex items-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:border-brand-400 hover:text-[var(--color-text-primary)] transition-colors w-full justify-center"
      >
        <Plus className="h-3 w-3" />
        Grant extension
      </button>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <select
        value={extension}
        onChange={(e) => setExtension(e.target.value)}
        className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs"
      >
        <option value="">Select extension...</option>
        {available.map((ext) => (
          <option key={ext} value={ext}>
            {ext}
          </option>
        ))}
      </select>
      <button
        onClick={handleGrant}
        disabled={!extension || loading}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "..." : "Grant"}
      </button>
      <button
        onClick={() => setShowForm(false)}
        className="rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Revoke Permission ───────────────────────────────

export function RevokePermissionButton({
  userId,
  extension,
}: {
  userId: string;
  extension: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    if (!confirm(`Revoke ${extension} from this user?`)) return;
    setLoading(true);

    await fetch(
      `/api/admin/users/${userId}/permissions?extension=${encodeURIComponent(extension)}`,
      { method: "DELETE" }
    );

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={loading}
      className="rounded p-1 text-[var(--color-text-muted)] hover:text-red-600 disabled:opacity-50"
      title="Revoke permission"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

// ─── Send Invitation ─────────────────────────────────

export function SendInviteForm({ email }: { email: string }) {
  const router = useRouter();
  const [extensions, setExtensions] = useState<string[]>([]);
  const [allExtensions, setAllExtensions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (showForm && allExtensions.length === 0) {
      fetch("/api/admin/extensions")
        .then((res) => res.json())
        .then((data) => setAllExtensions(data.extensions || []))
        .catch(() => {});
    }
  }, [showForm, allExtensions.length]);

  function toggleExtension(ext: string) {
    setExtensions((prev) =>
      prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext]
    );
  }

  async function handleSend() {
    if (extensions.length === 0) return;
    setLoading(true);

    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, extensions, tier: "client" }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setResult(data.status === "permissions_granted"
        ? "Permissions updated!"
        : "Invitation sent!");
      setShowForm(false);
      setExtensions([]);
      router.refresh();
      setTimeout(() => setResult(null), 3000);
    } else {
      setResult(`Error: ${data.error}`);
    }
  }

  if (result) {
    return (
      <div className="mt-3 rounded-lg bg-green-50 p-2 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
        {result}
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="mt-3 flex items-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:border-brand-400 hover:text-[var(--color-text-primary)] transition-colors w-full justify-center"
      >
        <Send className="h-3 w-3" />
        Send invitation email
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-[var(--color-border)] p-3">
      <p className="text-xs font-medium text-[var(--color-text-secondary)]">
        Select extensions to grant:
      </p>
      <div className="flex flex-wrap gap-1">
        {allExtensions.map((ext) => (
          <button
            key={ext}
            onClick={() => toggleExtension(ext)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
              extensions.includes(ext)
                ? "bg-brand-600 text-white"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-brand-50 dark:hover:bg-brand-950"
            }`}
          >
            {ext.replace("nexus/", "")}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSend}
          disabled={extensions.length === 0 || loading}
          className="flex-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Sending..." : `Send invite (${extensions.length} ext)`}
        </button>
        <button
          onClick={() => { setShowForm(false); setExtensions([]); }}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
