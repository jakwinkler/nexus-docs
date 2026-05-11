import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { prisma } from "@/lib/db";
import { IdeaActions } from "./actions";

export const metadata: Metadata = { title: "Ideas" };
export const dynamic = "force-dynamic";

const STATUSES = ["new", "reviewing", "planned", "shipped", "declined"] as const;

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  reviewing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  planned: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  shipped: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  declined: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const where = status && STATUSES.includes(status as (typeof STATUSES)[number])
    ? { status: status as (typeof STATUSES)[number] }
    : undefined;

  const ideas = await prisma.idea.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Ideas" description={`${ideas.length} idea${ideas.length === 1 ? "" : "s"}`} />

      <form className="mt-4 flex gap-2" action="/admin/ideas" method="GET">
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Filter
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {ideas.length === 0 ? (
          <p className="rounded-lg border border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
            No ideas yet.
          </p>
        ) : (
          ideas.map((idea) => (
            <div
              key={idea.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">{idea.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[idea.status]}`}>
                      {idea.status}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">
                    {idea.description}
                  </p>
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    {idea.author?.name || idea.author?.email || "Unknown"} ·{" "}
                    {new Date(idea.createdAt).toLocaleDateString()}
                  </p>
                  {idea.adminNote && (
                    <div className="mt-2 rounded bg-[var(--color-surface-secondary)] p-2 text-xs">
                      <strong>Admin note:</strong> {idea.adminNote}
                    </div>
                  )}
                </div>
                <IdeaActions ideaId={idea.id} currentStatus={idea.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
