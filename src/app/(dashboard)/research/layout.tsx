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
    <div className="-mx-4 flex min-h-screen md:-mx-6 lg:-mx-8">
      <ResearchSidebar />
      <div className="min-w-0 flex-1 pt-16 md:pt-0">
        <PageTransition className="p-6 md:p-8">{children}</PageTransition>
      </div>
    </div>
  );
}
