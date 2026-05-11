import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tier?: string; search?: string }>;
}) {
  const { page: pageParam, tier, search } = await searchParams;
  const page = parseInt(pageParam || "1", 10);
  const limit = 25;

  const where: Record<string, unknown> = {};
  if (tier) where.tier = tier;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        createdAt: true,
        _count: { select: { permissions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const tierColors: Record<string, string> = {
    public: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    client: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    partner: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${total} total users`}
      />

      {/* Filters */}
      <form className="mt-4 flex gap-2" action="/admin/users" method="GET">
        <input
          name="search"
          type="text"
          defaultValue={search}
          placeholder="Search by name or email..."
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
        />
        <select
          name="tier"
          defaultValue={tier}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
        >
          <option value="">All tiers</option>
          <option value="public">Public</option>
          <option value="client">Client</option>
          <option value="partner">Partner</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Filter
        </button>
      </form>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Tier</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Extensions</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${user.id}`} className="font-medium text-brand-600 hover:underline">
                      {user.name || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[user.tier]}`}>
                      {user.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{user._count.permissions}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/users?page=${page - 1}${tier ? `&tier=${tier}` : ""}${search ? `&search=${search}` : ""}`}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/users?page=${page + 1}${tier ? `&tier=${tier}` : ""}${search ? `&search=${search}` : ""}`}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
