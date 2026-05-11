"use client";

import { useState } from "react";
import { Bug, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportIssueProps {
  pagePath: string;
  pageTitle: string;
}

export function ReportIssue({ pagePath, pageTitle }: ReportIssueProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    issueUrl: string | null;
    branchName: string | null;
    error?: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagePath, pageTitle, description, priority }),
      });
      const data = await res.json().catch(() => ({}));
      setResult({
        ok: res.ok,
        issueUrl: data.issueUrl ?? null,
        branchName: data.branchName ?? null,
        error: res.ok ? undefined : data.error || "Submission failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <Bug className="h-4 w-4" />
        Report an issue
      </button>
    );
  }

  if (result) {
    if (!result.ok) {
      return (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-950/30">
          <p className="font-medium text-red-800 dark:text-red-300">
            {result.error || "Failed to submit. Please try again."}
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm dark:border-green-800 dark:bg-green-950/30">
        <p className="font-medium text-green-800 dark:text-green-300">
          Thanks — your report was received.
        </p>
        <div className="mt-2 space-y-1 text-green-700 dark:text-green-400">
          {result.issueUrl ? (
            <a
              href={result.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              View tracking issue <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p>An admin will follow up.</p>
          )}
          {result.branchName && (
            <p>
              Branch: <code className="font-mono">{result.branchName}</code>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[var(--color-border)] p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Report an Issue</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          Cancel
        </button>
      </div>

      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Page: {pagePath}
      </p>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe the issue..."
        required
        rows={3}
        className="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          {(["low", "medium", "high"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                priority === p
                  ? p === "high"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    : p === "medium"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors",
            submitting && "opacity-50 cursor-not-allowed"
          )}
        >
          {submitting ? "Creating..." : "Submit"}
        </button>
      </div>
    </form>
  );
}
