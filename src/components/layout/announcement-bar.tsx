"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

interface Announcement {
  id: string;
  message: string;
  link?: { href: string; label: string };
  type?: "info" | "new" | "warning";
}

// Configure announcements here — newest first
const announcements: Announcement[] = [
  {
    id: "gdpr-v2-2026-03",
    message: "New: GDPR Compliance Suite v2.0 released with automated data processing records",
    link: { href: "/docs/extensions/compliance/gdpr-suite", label: "Read the docs →" },
    type: "new",
  },
];

const typeStyles = {
  info: "bg-brand-600 text-white",
  new: "bg-brand-600 text-white",
  warning: "bg-amber-500 text-white",
};

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dismissed-announcements");
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch {
      // localStorage unavailable
    }
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) return null;

  const active = announcements.find((a) => !dismissed.has(a.id));
  if (!active) return null;

  function dismiss() {
    const next = new Set(dismissed);
    next.add(active!.id);
    setDismissed(next);
    try {
      localStorage.setItem("dismissed-announcements", JSON.stringify([...next]));
    } catch {
      // localStorage unavailable
    }
  }

  return (
    <div className={`relative ${typeStyles[active.type || "info"]}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 text-sm">
        <span>{active.message}</span>
        {active.link && (
          <Link
            href={active.link.href}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            {active.link.label}
          </Link>
        )}
        <button
          onClick={dismiss}
          className="absolute right-3 rounded p-0.5 hover:bg-white/20 transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
