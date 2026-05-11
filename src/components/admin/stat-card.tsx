import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

export function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">
          {title}
        </p>
        <Icon className="h-4 w-4 text-[var(--color-text-muted)]" />
      </div>
      <p className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {description}
        </p>
      )}
    </div>
  );
}
