"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  title: string;
  href?: string;
  locked?: boolean;
  lockMessage?: string;
  children?: NavItem[];
}

interface SidebarProps {
  items: NavItem[];
}

export function Sidebar({ items }: SidebarProps) {
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <nav className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto py-6 pr-4">
        <SidebarItems items={items} depth={0} />
      </nav>
    </aside>
  );
}

/** Check if pathname is at or under a node's href */
function isPathUnderNode(pathname: string, nodeHref: string): boolean {
  return pathname === nodeHref || pathname.startsWith(nodeHref + "/");
}

function SidebarItems({ items, depth }: { items: NavItem[]; depth: number }) {
  const pathname = usePathname();

  return (
    <ul className={cn("space-y-1", depth > 0 && "ml-3 border-l border-[var(--color-border)] pl-3")}>
      {items.map((item) => {
        const isActive = item.href === pathname;
        const hasChildren = item.children && item.children.length > 0;

        // Only expand children if the current path is at or under this node
        const isExpanded = hasChildren && item.href
          ? isPathUnderNode(pathname, item.href)
          : false;

        return (
          <li key={item.href || item.title}>
            {item.href ? (
              <Link
                href={item.locked ? `${item.href}?locked=true` : item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
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
              <div className="flex items-center gap-1 px-2 py-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
                {hasChildren && <ChevronRight className="h-3.5 w-3.5" />}
                {item.title}
              </div>
            )}
            {isExpanded && (
              <SidebarItems items={item.children!} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
