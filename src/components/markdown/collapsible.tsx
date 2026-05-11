"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Collapsible({
  title,
  defaultOpen = false,
  children,
}: CollapsibleProps) {
  return (
    <details
      className="group my-4 rounded-lg border border-[var(--color-border)] not-prose"
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors rounded-lg select-none list-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200",
            "group-open:rotate-90"
          )}
        />
        {title}
      </summary>
      <div className="border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-secondary)] [&_p]:mt-1 [&_p:first-child]:mt-0">
        {children}
      </div>
    </details>
  );
}
