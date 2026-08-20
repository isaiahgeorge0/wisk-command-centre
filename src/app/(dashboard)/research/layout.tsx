import { ResearchLockedClient } from "@/components/research/research-locked-client";
import { ResearchSidebar } from "@/components/research/research-sidebar";
import { PageTransition } from "@/components/layout/page-transition";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasResearchAccess } from "@/lib/billing/access";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await getScopedSupabase();
  const admin = createAdminClient();
  const canAccessResearch = await hasResearchAccess(userId, admin);

  if (!canAccessResearch) {
    return <ResearchLockedClient />;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <ResearchSidebar />
      <div className="min-w-0 flex-1 pt-14 md:pt-0">
        <PageTransition className="p-5 md:p-8">{children}</PageTransition>
      </div>
    </div>
  );
}
