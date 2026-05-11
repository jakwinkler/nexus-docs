"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FileText, Lock } from "lucide-react";

interface SearchHit {
  slug: string;
  title: string;
  summary: string;
  product: string;
  access_tier: string;
  _formatted?: {
    title?: string;
    summary?: string;
  };
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setQuery("");
      setHits([]);
      setSelected(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setHits(data.hits || []);
        setSelected(0);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const navigate = useCallback(
    (slug: string) => {
      setOpen(false);
      router.push(`/docs/${slug}`);
    },
    [router]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && hits[selected]) {
      navigate(hits[selected].slug);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4">
          <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search documentation..."
            className="flex-1 bg-transparent py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
          />
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">
              Searching...
            </div>
          )}

          {!loading && query && hits.length === 0 && (
            <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">
              No results found
            </div>
          )}

          {hits.map((hit, i) => (
            <button
              key={hit.slug}
              onClick={() => navigate(hit.slug)}
              className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                i === selected
                  ? "bg-brand-50 dark:bg-brand-950"
                  : "hover:bg-[var(--color-surface-secondary)]"
              }`}
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {hit.title}
                  </span>
                  {hit.access_tier !== "public" && (
                    <Lock className="h-3 w-3 text-[var(--color-text-muted)]" />
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {hit.summary}
                </p>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {hit.product}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-[var(--color-border)] px-4 py-2 text-[10px] text-[var(--color-text-muted)]">
          <span>
            <kbd className="rounded border border-[var(--color-border)] px-1">↑↓</kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="rounded border border-[var(--color-border)] px-1">↵</kbd>{" "}
            open
          </span>
          <span>
            <kbd className="rounded border border-[var(--color-border)] px-1">esc</kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
