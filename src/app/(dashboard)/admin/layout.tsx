import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-orange-500/25 bg-linear-to-r from-orange-500/8 via-orange-400/5 to-transparent px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <AdminNav />
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-orange-700 dark:hover:text-orange-300"
          >
            ← Back to WISK
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
