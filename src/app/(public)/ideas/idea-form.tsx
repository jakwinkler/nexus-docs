"use client";

import { useState, FormEvent } from "react";

export function IdeaForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    setSubmitting(false);

    if (res.ok) {
      setSuccess(true);
      setTitle("");
      setDescription("");
      return;
    }

    if (res.status === 429) {
      setError("Too many submissions. Please slow down.");
      return;
    }

    const body = await res.json().catch(() => ({}));
    setError(body.error || "Submission failed. Please try again.");
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-300 bg-green-50 p-6 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
        <h2 className="text-lg font-semibold">Thanks — got it!</h2>
        <p className="mt-2 text-sm">
          We&apos;ll review your idea and email you when its status changes.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 text-sm font-medium text-green-700 hover:underline dark:text-green-300"
        >
          Submit another idea
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          minLength={5}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="One-line summary of the idea"
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          required
          minLength={10}
          maxLength={5000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What would you like to see, and why?"
          rows={6}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {description.length} / 5000 characters
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-brand-600 px-6 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit idea"}
      </button>
    </form>
  );
}
