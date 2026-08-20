import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasResearchAccess } from "@/lib/billing/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchPageClient } from "@/components/research/research-page-client";
import {
  PAGE_SUBTITLE_CLASS,
  PAGE_TITLE_CLASS,
} from "@/lib/navigation";

import { getResearchPageData } from "./actions";

export default async function ResearchPage() {
  const { userId } = await getScopedSupabase();
  const admin = createAdminClient();
  const canAccessResearch = await hasResearchAccess(userId, admin);

  if (!canAccessResearch) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Research</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Research is not enabled for this account yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = await getResearchPageData();

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Research</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Win-rate analytics, competitor watchlist, and research chat
        </p>
      </div>
      <ResearchPageClient initialData={data} />
    </div>
  );
}
