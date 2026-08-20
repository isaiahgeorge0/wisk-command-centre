import { ResearchSignalsClient } from "@/components/research/research-signals-client";

import { getResearchPageData } from "../actions";

export default async function ResearchSignalsPage() {
  const data = await getResearchPageData();
  if (!data) return null;

  return (
    <ResearchSignalsClient
      competitors={data.competitors}
      canAccessResearchPro={data.canAccessResearchPro}
    />
  );
}
