import { ResearchWinRateClient } from "@/components/research/research-win-rate-client";

import { getResearchPageData } from "../actions";

export default async function ResearchWinRatePage() {
  const data = await getResearchPageData();
  if (!data) return null;

  return <ResearchWinRateClient initialDashboard={data.winRate} />;
}
