import { getResearchDocumentsPageData } from "./actions";
import { ResearchDocumentsClient } from "@/components/research/research-documents-client";
import { ResearchLockedClient } from "@/components/research/research-locked-client";

export default async function ResearchDocumentsPage() {
  const data = await getResearchDocumentsPageData();
  if (!data) {
    return <ResearchLockedClient />;
  }

  return <ResearchDocumentsClient documents={data.documents} />;
}
