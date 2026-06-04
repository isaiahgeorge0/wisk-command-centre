import { getGoals } from "@/app/goals/actions";
import { GoalsPageClient } from "@/components/goals/goals-page-client";

export default async function GoalsPage() {
  const goals = await getGoals();

  return <GoalsPageClient initialGoals={goals} />;
}
