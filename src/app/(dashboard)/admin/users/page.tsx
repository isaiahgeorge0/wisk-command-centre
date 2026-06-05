import {
  getUserHealthSummary,
  getUsersWithHealth,
} from "@/app/(dashboard)/admin/actions";
import { UsersHealthClient } from "@/components/admin/users-health-client";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

export default async function AdminUsersPage() {
  const [users, summary] = await Promise.all([
    getUsersWithHealth(),
    getUserHealthSummary(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Users</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          All registered accounts with activity and engagement signals.
        </p>
      </div>
      <UsersHealthClient users={users} summary={summary} />
    </div>
  );
}
