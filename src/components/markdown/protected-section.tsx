"use client";

import { Lock } from "lucide-react";

interface ProtectedSectionProps {
  tier: string;
  tierLabel?: string;
  allowed: boolean;
  children: React.ReactNode;
}

export function ProtectedSection({
  tier,
  tierLabel,
  allowed,
  children,
}: ProtectedSectionProps) {
  if (allowed) {
    return <>{children}</>;
  }

  const label = tierLabel || tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="my-6 not-prose rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/30">
          <Lock className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {label} Content
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            This section is available to {label} members and above.
            Sign in or request access to view.
          </p>
        </div>
      </div>
    </div>
  );
}
