import { ResearchWatchlistClient } from "@/components/research/research-watchlist-client";

import { getResearchPageData } from "../actions";

export default async function ResearchWatchlistPage() {
  const data = await getResearchPageData();
  if (!data) return null;

  return (
    <ResearchWatchlistClient
      competitors={data.competitors}
      competitorCap={data.competitorCap}
      canAccessResearchPro={data.canAccessResearchPro}
    />
  );
}
