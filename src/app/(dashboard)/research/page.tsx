import { ResearchOverviewClient } from "@/components/research/research-overview-client";

import { getResearchOverviewStats } from "./actions";

export default async function ResearchOverviewPage() {
  const stats = await getResearchOverviewStats();
  if (!stats) return null;
  return <ResearchOverviewClient stats={stats} />;
}
