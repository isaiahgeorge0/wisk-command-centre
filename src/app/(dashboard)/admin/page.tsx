import Link from "next/link";

import {
  getAdminStats,
  getPlatformMetrics,
  getUsers,
} from "@/app/(dashboard)/admin/actions";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { PlatformMetricsSection } from "@/components/admin/platform-metrics-section";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminOverviewPage() {
  const [stats, platformMetrics, users] = await Promise.all([
    getAdminStats(),
    getPlatformMetrics(),
    getUsers(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Admin overview</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Access requests, users, and platform announcements.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total access requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.totalRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-amber-600 dark:text-amber-400">
              {stats.pendingRequests}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Requests this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.requestsThisWeek}</p>
          </CardContent>
        </Card>
      </div>

      <PlatformMetricsSection metrics={platformMetrics} />

      <AdminQuickActions users={users} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent access requests</CardTitle>
            <Link
              href="/admin/requests"
              className="text-sm text-orange-600 hover:underline dark:text-orange-400"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              stats.recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(request.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline">{request.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent signups</CardTitle>
            <Link
              href="/admin/users"
              className="text-sm text-orange-600 hover:underline dark:text-orange-400"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <p className="font-medium">
                    {user.name?.trim() || user.email.split("@")[0]}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDate(user.created_at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
