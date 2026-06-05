import { getContentPosts } from "@/app/(dashboard)/content/actions";
import { ContentPageClient } from "@/components/content/content-page-client";
import { getGoals } from "@/app/(dashboard)/goals/actions";
import { filterContentGoals } from "@/lib/content/selectors";

export default async function ContentPage() {
  const [posts, goals] = await Promise.all([getContentPosts(), getGoals()]);
  const contentGoals = filterContentGoals(goals);

  return (
    <ContentPageClient initialPosts={posts} contentGoals={contentGoals} />
  );
}
