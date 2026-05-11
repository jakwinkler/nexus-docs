"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const startLoading = useCallback(() => {
    setLoading(true);
    setProgress(0);

    // Animate progress: fast start, slow middle, never reaches 100
    let current = 0;
    const interval = setInterval(() => {
      current += (90 - current) * 0.1;
      setProgress(current);
      if (current >= 89) clearInterval(interval);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const stopLoading = useCallback(() => {
    setProgress(100);
    setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 200);
  }, []);

  // Listen for route changes
  useEffect(() => {
    stopLoading();
  }, [pathname, searchParams, stopLoading]);

  // Intercept link clicks to start loading
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Skip external links, hash links, and same-page links
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        target.getAttribute("target") === "_blank"
      ) {
        return;
      }

      // Skip if it's the current page
      if (href === pathname) return;

      cleanup = startLoading();
    }

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      cleanup?.();
    };
  }, [pathname, startLoading]);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[3px] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 shadow-[0_0_10px_var(--color-brand-400)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: loading ? 1 : 0,
        }}
      />
    </div>
  );
}
