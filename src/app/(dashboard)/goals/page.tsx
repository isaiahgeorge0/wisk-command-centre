import { getPublishedPostCountsByGoalIds } from "@/app/(dashboard)/content/actions";
import { getGoals } from "@/app/(dashboard)/goals/actions";
import { GoalsPageClient } from "@/components/goals/goals-page-client";

export default async function GoalsPage() {
  const goals = await getGoals();
  const publishedPostCounts = await getPublishedPostCountsByGoalIds(
    goals.map((goal) => goal.id)
  );

  return (
    <GoalsPageClient
      initialGoals={goals}
      publishedPostCounts={publishedPostCounts}
    />
  );
}
