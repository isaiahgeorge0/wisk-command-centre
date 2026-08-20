import { Lock } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PAGE_SUBTITLE_CLASS,
  PAGE_TITLE_CLASS,
} from "@/lib/navigation";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasResearchAccess } from "@/lib/billing/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { ResearchPageClient } from "@/components/research/research-page-client";

import { getResearchPageData } from "./actions";

export default async function ResearchPage() {
  const { userId } = await getScopedSupabase();
  const admin = createAdminClient();
  const canAccessResearch = await hasResearchAccess(userId, admin);

  if (!canAccessResearch) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className={PAGE_TITLE_CLASS}>Research</h1>
          <p className={PAGE_SUBTITLE_CLASS}>
            Win-rate analytics, competitor watchlist, and research chat
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Unlock WISK Research</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Lock className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Lead briefs, competitor watchlist, and win-rate analytics
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  £19/month. Research Pro (£39) adds open cited chat and
                  findings → Winston proposals.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/upgrade/research"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-cyan-600 px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Upgrade to Research
              </Link>
              <Link
                href="/upgrade/research-pro"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border/60 bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
              >
                See Research Pro
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
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
