import { ResearchLeadsClient } from "@/components/research/research-leads-client";

import { getResearchLeadIntelligence } from "../actions";

export default async function ResearchLeadsPage() {
  const data = await getResearchLeadIntelligence();
  if (!data) return null;

  return <ResearchLeadsClient data={data} />;
}
