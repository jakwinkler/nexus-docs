import type { Metadata } from "next";
import { Users, FileText, ShieldCheck, Eye } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { PageHeader } from "@/components/admin/page-header";
import { prisma } from "@/lib/db";
import { getAllDocs } from "@/lib/content";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [totalUsers, pendingRequests, recentViews, docs, recentActivity] =
    await Promise.all([
      prisma.user.count(),
      prisma.accessRequest.count({ where: { status: "pending" } }),
      prisma.auditLog.count({
        where: { event: "page.viewed", timestamp: { gte: thirtyDaysAgo } },
      }),
      getAllDocs(),
      prisma.auditLog.findMany({
        orderBy: { timestamp: "desc" },
        take: 10,
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your documentation portal."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
        />
        <StatCard
          title="Documents"
          value={docs.length}
          icon={FileText}
          description={`${docs.filter((d) => d.status === "published").length} published`}
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests}
          icon={ShieldCheck}
        />
        <StatCard
          title="Views (30d)"
          value={recentViews}
          icon={Eye}
        />
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Recent Activity
        </h2>
        <div className="mt-3 rounded-lg border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {recentActivity.length === 0 ? (
            <div className="p-4 text-sm text-[var(--color-text-muted)]">
              No recent activity
            </div>
          ) : (
            recentActivity.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {log.event}
                  </span>
                  <span className="ml-2 text-sm text-[var(--color-text-muted)]">
                    {log.user?.name || log.user?.email || "System"}
                  </span>
                </div>
                <time className="text-xs text-[var(--color-text-muted)]">
                  {new Date(log.timestamp).toLocaleString()}
                </time>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
