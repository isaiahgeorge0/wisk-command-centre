import { OpenResearchWinstonOnQuery } from "@/components/research/open-research-winston-on-query";
import { ResearchChatClient } from "@/components/research/research-chat-client";

import { getResearchPageData } from "../actions";

type ResearchChatPageProps = {
  searchParams: Promise<{ askWinston?: string }>;
};

export default async function ResearchChatPage({
  searchParams,
}: ResearchChatPageProps) {
  const { askWinston } = await searchParams;
  const data = await getResearchPageData();
  if (!data) return null;

  return (
    <>
      {askWinston === "1" && data.canAccessResearchPro ? (
        <OpenResearchWinstonOnQuery enabled />
      ) : null}
      <ResearchChatClient canAccessResearchPro={data.canAccessResearchPro} />
    </>
  );
}
