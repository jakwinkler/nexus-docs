"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, ChevronRight, ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./sidebar";

interface MobileSidebarProps {
  items: NavItem[];
}

export function MobileSidebar({ items }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden rounded-lg p-2 hover:bg-[var(--color-surface-secondary)] transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-[70] w-72 transform bg-[var(--color-surface)] shadow-xl transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <span className="text-xl font-bold text-brand-600">nexus</span>
            <span className="text-sm text-[var(--color-text-secondary)]">
              docs
            </span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 hover:bg-[var(--color-surface-secondary)] transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="overflow-y-auto p-4 max-h-[calc(100vh-4rem)]">
          <MobileNavItems items={items} depth={0} />
        </nav>
      </div>
    </>
  );
}

function MobileNavItems({
  items,
  depth,
}: {
  items: NavItem[];
  depth: number;
}) {
  const pathname = usePathname();

  return (
    <ul
      className={cn(
        "space-y-1",
        depth > 0 &&
          "ml-3 border-l border-[var(--color-border)] pl-3"
      )}
    >
      {items.map((item) => {
        const isActive = item.href === pathname;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = hasChildren && item.href
          ? pathname === item.href || pathname.startsWith(item.href + "/")
          : false;

        return (
          <li key={item.href || item.title}>
            {item.href ? (
              <Link
                href={item.locked ? `${item.href}?locked=true` : item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700 font-medium dark:bg-brand-950 dark:text-brand-300"
                    : isExpanded
                      ? "text-[var(--color-text-primary)] font-medium"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]",
                  item.locked && "opacity-70"
                )}
              >
                {hasChildren && (
                  isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="flex-1 truncate">{item.title}</span>
                {item.locked && (
                  <Lock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                )}
              </Link>
            ) : (
              <div className="flex items-center gap-1 px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]">
                {hasChildren && <ChevronRight className="h-3.5 w-3.5" />}
                {item.title}
              </div>
            )}
            {isExpanded && (
              <MobileNavItems items={item.children!} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
