"use client";

import { Clock } from "lucide-react";

interface ReadingTimeProps {
  content: string;
}

/**
 * Calculates reading time from markdown content.
 * Uses 238 words-per-minute (average adult reading speed for technical content).
 * Strips markdown syntax and code blocks for more accurate word count.
 */
function calculateReadingTime(content: string): number {
  // Strip code blocks (they take longer to read, count at half speed)
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  const codeWordCount = codeBlocks
    .join(" ")
    .replace(/```\w*/g, "")
    .split(/\s+/)
    .filter(Boolean).length;

  // Strip markdown syntax for prose word count
  const prose = content
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/`[^`]+`/g, "") // remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, "") // remove images
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // links -> text
    .replace(/#{1,6}\s/g, "") // remove heading markers
    .replace(/[*_~]+/g, "") // remove emphasis markers
    .replace(/>\s/g, "") // remove blockquotes
    .replace(/[-*+]\s/g, "") // remove list markers
    .replace(/\d+\.\s/g, "") // remove numbered list markers
    .replace(/---/g, "") // remove horizontal rules
    .replace(/\|.*\|/g, "") // remove table rows
    .trim();

  const proseWordCount = prose.split(/\s+/).filter(Boolean).length;

  // Code reads at roughly half the speed of prose
  const totalReadingMinutes = proseWordCount / 238 + codeWordCount / 120;

  return Math.max(1, Math.ceil(totalReadingMinutes));
}

export function ReadingTime({ content }: ReadingTimeProps) {
  const minutes = calculateReadingTime(content);

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
      <Clock className="h-3.5 w-3.5" />
      <span>{minutes} min read</span>
    </span>
  );
}
