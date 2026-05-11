import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NavItem } from "@/components/layout/sidebar";

interface PrevNextLink {
  title: string;
  href: string;
}

interface PrevNextNavProps {
  currentSlug: string;
  navItems: NavItem[];
}

function flattenNavItems(items: NavItem[]): PrevNextLink[] {
  const result: PrevNextLink[] = [];
  for (const item of items) {
    if (item.href && !item.locked) {
      result.push({ title: item.title, href: item.href });
    }
    if (item.children) {
      result.push(...flattenNavItems(item.children));
    }
  }
  return result;
}

export function PrevNextNav({ currentSlug, navItems }: PrevNextNavProps) {
  const flatPages = flattenNavItems(navItems);
  const currentHref = `/docs/${currentSlug}`;
  const currentIndex = flatPages.findIndex((p) => p.href === currentHref);

  if (currentIndex === -1) return null;

  const prev = currentIndex > 0 ? flatPages[currentIndex - 1] : null;
  const next =
    currentIndex < flatPages.length - 1 ? flatPages[currentIndex + 1] : null;

  if (!prev && !next) return null;

  return (
    <nav
      className="mt-12 flex items-stretch gap-4 border-t border-[var(--color-border)] pt-6"
      aria-label="Page navigation"
    >
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-1 flex-col items-start rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:border-brand-400 hover:bg-[var(--color-surface-secondary)]"
        >
          <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] group-hover:text-brand-500">
            <ChevronLeft className="h-3 w-3" />
            Previous
          </span>
          <span className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {next ? (
        <Link
          href={next.href}
          className="group flex flex-1 flex-col items-end rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:border-brand-400 hover:bg-[var(--color-surface-secondary)]"
        >
          <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] group-hover:text-brand-500">
            Next
            <ChevronRight className="h-3 w-3" />
          </span>
          <span className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
            {next.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}
