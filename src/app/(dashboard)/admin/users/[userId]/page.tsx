import { notFound } from "next/navigation";

import { getUserDetail } from "@/app/(dashboard)/admin/actions";
import { UserDetailSection } from "@/components/admin/user-detail-section";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

type Params = Promise<{ userId: string }>;

export default async function AdminUserDetailPage({
  params,
}: {
  params: Params;
}) {
  const { userId } = await params;
  const result = await getUserDetail(userId);

  if (!result.success || !result.data) {
    notFound();
  }

  const user = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>User Detail</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Full account picture for {user.name ?? user.email}.
        </p>
      </div>
      <UserDetailSection data={user} />
    </div>
  );
}
