"use client";

import { useEffect, useState } from "react";

/**
 * A thin progress bar fixed at the top of the viewport that shows
 * how far through the article the reader has scrolled.
 * Inspired by Linear and many modern blog/docs sites.
 */
export function PageProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const article = document.querySelector("article");
      if (!article) return;

      const articleRect = article.getBoundingClientRect();
      const articleTop = articleRect.top + window.scrollY;
      const articleHeight = article.scrollHeight;
      const windowHeight = window.innerHeight;

      // Calculate how far through the article the user has scrolled
      const scrolled = window.scrollY - articleTop;
      const scrollableDistance = articleHeight - windowHeight;

      if (scrollableDistance <= 0) {
        setProgress(100);
        return;
      }

      const pct = Math.min(100, Math.max(0, (scrolled / scrollableDistance) * 100));
      setProgress(pct);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Don't show if we haven't started reading
  if (progress <= 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div
        className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
