import { redirect } from "next/navigation";

import { getFeedbackStats } from "@/app/(dashboard)/admin/actions";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { PageTransition } from "@/components/layout/page-transition";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { isAdminEmail } from "@/lib/auth/is-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getAuthContext();
  if (!isAdminEmail(user.email)) {
    redirect("/");
  }

  const { newCount } = await getFeedbackStats();

  return (
    <div className="flex min-h-screen">
      <AdminSidebar newFeedbackCount={newCount} />
      <div className="min-w-0 flex-1 pt-16 md:pt-0">
        <PageTransition className="p-6 md:p-8">
          {children}
        </PageTransition>
      </div>
    </div>
  );
}
