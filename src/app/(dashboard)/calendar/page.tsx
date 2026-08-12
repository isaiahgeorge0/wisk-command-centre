import { getCalendarEvents } from "@/app/(dashboard)/calendar/actions";
import { getAllMilestones } from "@/app/(dashboard)/projects/milestones/actions";
import { getContentPosts } from "@/app/(dashboard)/content/actions";
import { getGoals } from "@/app/(dashboard)/goals/actions";
import { getProjects } from "@/app/(dashboard)/projects/actions";
import { getTasks } from "@/app/(dashboard)/tasks/actions";
import { CalendarPageClient } from "@/components/calendar/calendar-page-client";
import { hasAIAccess } from "@/lib/billing/access";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { filterContentGoals } from "@/lib/content/selectors";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CalendarPage() {
  const { supabase, userId } = await getScopedSupabase();

  const [
    { data: prefs },
    projects,
    tasks,
    goals,
    milestones,
    contentPosts,
    standaloneEvents,
  ] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("ai_access")
      .eq("user_id", userId)
      .maybeSingle(),
    getProjects(),
    getTasks(),
    getGoals(),
    getAllMilestones(),
    getContentPosts(),
    getCalendarEvents(),
  ]);

  const contentGoals = filterContentGoals(goals);
  const canAccessWinston = await hasAIAccess(
    userId,
    createAdminClient(),
    prefs?.ai_access ?? false
  );

  return (
    <CalendarPageClient
      projects={projects}
      tasks={tasks}
      goals={goals}
      milestones={milestones}
      contentPosts={contentPosts}
      standaloneEvents={standaloneEvents}
      contentGoals={contentGoals}
      canAccessWinston={canAccessWinston}
    />
  );
}
