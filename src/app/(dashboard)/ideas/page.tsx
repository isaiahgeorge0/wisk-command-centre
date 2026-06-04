import { getIdeas } from "@/app/(dashboard)/ideas/actions";
import { IdeasPageClient } from "@/components/ideas/ideas-page-client";

export default async function IdeasPage() {
  const ideas = await getIdeas();

  return <IdeasPageClient initialIdeas={ideas} />;
}
