"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Send, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface LockedContentProps {
  title: string;
  requiredTier: string;
  requiredTierLabel?: string;
  userTier: string;
  extensions?: string[];
}

const tierMessages: Record<
  string,
  Record<string, { heading: string; description: string; showRequest: boolean }>
> = {
  // Anonymous user
  public: {
    client: {
      heading: "Client Access Required",
      description:
        "Log in or purchase this extension to view this documentation.",
      showRequest: false,
    },
    partner: {
      heading: "Partners Only",
      description:
        "This content is available to nexus Partners only.",
      showRequest: false,
    },
    admin: {
      heading: "Restricted Content",
      description: "This content is restricted to nexus administrators.",
      showRequest: false,
    },
  },
  // Authenticated client
  client: {
    client: {
      heading: "Extension Not Purchased",
      description:
        "Purchase this extension to access its documentation.",
      showRequest: false,
    },
    partner: {
      heading: "Partners Only",
      description:
        "This content is available to nexus Partners. You can request access below.",
      showRequest: true,
    },
    admin: {
      heading: "Restricted Content",
      description: "This content is restricted to nexus administrators.",
      showRequest: false,
    },
  },
  // Partner
  partner: {
    admin: {
      heading: "Admin Only",
      description: "This content is restricted to nexus administrators.",
      showRequest: false,
    },
  },
};

export function LockedContent({
  title,
  requiredTier,
  requiredTierLabel,
  userTier,
  extensions,
}: LockedContentProps) {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const label = requiredTierLabel || requiredTier;

  // Try specific tier message, fall back to generic with tier label
  const config = tierMessages[userTier]?.[requiredTier] || {
    heading: `${label} Access Required`,
    description: `This content is available to ${label} members only.`,
    showRequest: userTier !== "public",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/access/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagePath: window.location.pathname,
          tierRequested: requiredTier,
          message,
        }),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
        <Lock className="h-8 w-8 text-[var(--color-text-muted)]" />
      </div>

      <h1 className="mt-6 text-2xl font-bold">{title}</h1>

      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        <ShieldCheck className="h-3.5 w-3.5" />
        {config.heading}
      </div>

      <p className="mt-4 text-[var(--color-text-secondary)]">
        {config.description}
      </p>

      {extensions && extensions.length > 0 && userTier !== "public" && (
        <div className="mt-4 text-sm text-[var(--color-text-muted)]">
          Required extension{extensions.length > 1 ? "s" : ""}:{" "}
          {extensions.map((ext) => ext.replace("nexus/", "")).join(", ")}
        </div>
      )}

      {config.showRequest && !submitted && (
        <form onSubmit={handleSubmit} className="mt-8 mx-auto max-w-md">
          <div className="rounded-xl border border-[var(--color-border)] p-6 text-left">
            <h3 className="text-sm font-semibold">Request Access</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Why do you need access? (optional)"
              rows={3}
              className="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors",
                submitting && "opacity-50 cursor-not-allowed"
              )}
            >
              <Send className="h-4 w-4" />
              {submitting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </form>
      )}

      {submitted && (
        <div className="mt-8 rounded-xl border border-green-300 bg-green-50 p-6 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          Your access request has been sent. You will receive an email when it
          is reviewed.
        </div>
      )}

      {userTier === "public" && (
        <div className="mt-8 text-sm text-[var(--color-text-muted)]">
          Already a partner?{" "}
          <Link
            href="/api/auth/signin"
            className="text-brand-600 hover:underline"
          >
            Log in
          </Link>
        </div>
      )}
    </div>
  );
}
