import { getUsers } from "@/app/(dashboard)/admin/actions";
import { UsersClient } from "@/components/admin/users-client";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Users</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          All registered WISK Command Centre accounts.
        </p>
      </div>
      <UsersClient users={users} />
    </div>
  );
}
