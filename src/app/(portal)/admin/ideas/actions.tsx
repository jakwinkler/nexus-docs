"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = ["new", "reviewing", "planned", "shipped", "declined"] as const;

export function IdeaActions({
  ideaId,
  currentStatus,
}: {
  ideaId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  async function changeStatus(status: string) {
    setLoading(true);
    await fetch(`/api/admin/ideas/${ideaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(note ? { adminNote: note } : {}) }),
    });
    setNote("");
    setShowNote(false);
    setLoading(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this idea?")) return;
    setLoading(true);
    await fetch(`/api/admin/ideas/${ideaId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex flex-wrap gap-1">
        {STATUSES.filter((s) => s !== currentStatus).map((s) => (
          <button
            key={s}
            onClick={() => changeStatus(s)}
            disabled={loading}
            className="rounded bg-stone-100 px-2 py-1 text-xs hover:bg-stone-200 disabled:opacity-50 dark:bg-stone-800 dark:hover:bg-stone-700"
          >
            {s}
          </button>
        ))}
        <button
          onClick={remove}
          disabled={loading}
          className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900 dark:text-red-300"
        >
          Delete
        </button>
      </div>
      <button
        onClick={() => setShowNote(!showNote)}
        className="text-xs text-brand-600 hover:underline"
      >
        {showNote ? "Hide note" : "Add note for next status change"}
      </button>
      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note (sent in email to submitter)…"
          maxLength={2000}
          className="w-64 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs"
          rows={2}
        />
      )}
    </div>
  );
}
