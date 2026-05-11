import { Clock, Calendar } from "lucide-react";

interface DocPageMetaProps {
  content: string;
  lastModified: string;
  owner?: string;
}

/**
 * Calculates reading time from markdown content.
 * Uses 238 words-per-minute for prose, 120 for code blocks.
 */
function calculateReadingTime(content: string): number {
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  const codeWordCount = codeBlocks
    .join(" ")
    .replace(/```\w*/g, "")
    .split(/\s+/)
    .filter(Boolean).length;

  const prose = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/[*_~]+/g, "")
    .replace(/>\s/g, "")
    .replace(/[-*+]\s/g, "")
    .replace(/\d+\.\s/g, "")
    .replace(/---/g, "")
    .replace(/\|.*\|/g, "")
    .trim();

  const proseWordCount = prose.split(/\s+/).filter(Boolean).length;
  const totalMinutes = proseWordCount / 238 + codeWordCount / 120;

  return Math.max(1, Math.ceil(totalMinutes));
}

export function DocPageMeta({ content, lastModified, owner }: DocPageMetaProps) {
  const minutes = calculateReadingTime(content);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        {minutes} min read
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        {new Date(lastModified).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
      {owner && (
        <span className="text-[var(--color-text-muted)]">
          by {owner}
        </span>
      )}
    </div>
  );
}
