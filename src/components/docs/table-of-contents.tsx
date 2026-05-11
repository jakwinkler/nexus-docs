"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    const elements = article.querySelectorAll("h2, h3");
    const items: TocItem[] = Array.from(elements)
      .filter((el) => el.id)
      .map((el) => ({
        id: el.id,
        text: el.textContent?.replace(/^#\s*/, "") || "",
        level: Number(el.tagName.charAt(1)),
      }));

    setHeadings(items);
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          const newActiveId = visibleEntries[0].target.id;
          setActiveId(newActiveId);
          // Track which sections have been read
          setReadIds((prev) => {
            const next = new Set(prev);
            next.add(newActiveId);
            return next;
          });
        }
      },
      {
        rootMargin: "-80px 0px -80% 0px",
        threshold: 0,
      }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  // Calculate reading completion percentage
  const completionPct = useMemo(() => {
    if (headings.length === 0) return 0;
    return Math.round((readIds.size / headings.length) * 100);
  }, [headings, readIds]);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden xl:block w-56 shrink-0">
      <nav
        className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto py-6 pl-4"
        aria-label="Table of contents"
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            On this page
          </h4>
          {completionPct > 0 && completionPct < 100 && (
            <span className="text-[10px] font-medium text-[var(--color-text-muted)] tabular-nums">
              {completionPct}%
            </span>
          )}
          {completionPct === 100 && (
            <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
              Done
            </span>
          )}
        </div>

        {/* Completion progress bar */}
        {headings.length > 2 && (
          <div className="mb-3 h-0.5 w-full rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        )}

        <ul className="space-y-0.5 border-l border-[var(--color-border)]">
          {headings.map((heading) => {
            const isActive = activeId === heading.id;
            const isRead = readIds.has(heading.id);

            return (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(heading.id);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth" });
                      setActiveId(heading.id);
                      window.history.replaceState(null, "", `#${heading.id}`);
                    }
                  }}
                  className={cn(
                    "block border-l-2 -ml-px py-1 text-xs leading-relaxed transition-colors",
                    heading.level === 3 ? "pl-6" : "pl-3",
                    isActive
                      ? "border-brand-500 text-brand-600 font-medium dark:text-brand-400"
                      : isRead
                        ? "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)]"
                        : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                  )}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
