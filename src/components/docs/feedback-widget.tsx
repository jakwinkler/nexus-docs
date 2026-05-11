"use client";

import { useState, useCallback } from "react";
import { ThumbsUp, ThumbsDown, Send, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackWidgetProps {
  slug: string;
}

type FeedbackState = "idle" | "voted" | "commenting" | "submitted";

export function FeedbackWidget({ slug }: FeedbackWidgetProps) {
  const [state, setState] = useState<FeedbackState>("idle");
  const [vote, setVote] = useState<"yes" | "no" | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = useCallback(
    async (value: "yes" | "no") => {
      setVote(value);

      if (value === "no") {
        // Show comment box for negative feedback
        setState("commenting");
      } else {
        // Positive feedback: submit immediately
        setState("submitted");
        try {
          await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, helpful: true, comment: "" }),
          });
        } catch {
          // Silently fail — feedback is non-critical
        }
      }
    },
    [slug]
  );

  const handleSubmitComment = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          helpful: vote === "yes",
          comment: comment.trim(),
        }),
      });
    } catch {
      // Silently fail
    }
    setIsSubmitting(false);
    setState("submitted");
  }, [slug, vote, comment]);

  if (state === "submitted") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3">
        <Check className="h-4 w-4 text-green-500" />
        <span className="text-sm text-[var(--color-text-secondary)]">
          Thank you for your feedback!
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          Was this page helpful?
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleVote("yes")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
              vote === "yes"
                ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-green-300 hover:text-green-600 hover:bg-green-50 dark:hover:border-green-700 dark:hover:text-green-400 dark:hover:bg-green-950"
            )}
            aria-label="Yes, this page was helpful"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Yes
          </button>
          <button
            onClick={() => handleVote("no")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
              vote === "no"
                ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-red-300 hover:text-red-600 hover:bg-red-50 dark:hover:border-red-700 dark:hover:text-red-400 dark:hover:bg-red-950"
            )}
            aria-label="No, this page was not helpful"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            No
          </button>
        </div>
      </div>

      {/* Comment box for negative feedback */}
      {state === "commenting" && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What could be improved?"
            className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitComment();
            }}
            autoFocus
          />
          <button
            onClick={handleSubmitComment}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      )}
    </div>
  );
}
