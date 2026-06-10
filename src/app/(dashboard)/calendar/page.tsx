import { getCalendarEvents } from "@/app/(dashboard)/calendar/actions";
import { getAllMilestones } from "@/app/(dashboard)/projects/milestones/actions";
import { getContentPosts } from "@/app/(dashboard)/content/actions";
import { getGoals } from "@/app/(dashboard)/goals/actions";
import { getProjects } from "@/app/(dashboard)/projects/actions";
import { getTasks } from "@/app/(dashboard)/tasks/actions";
import { CalendarPageClient } from "@/components/calendar/calendar-page-client";
import { filterContentGoals } from "@/lib/content/selectors";

export default async function CalendarPage() {
  const [projects, tasks, goals, milestones, contentPosts, standaloneEvents] =
    await Promise.all([
      getProjects(),
      getTasks(),
      getGoals(),
      getAllMilestones(),
      getContentPosts(),
      getCalendarEvents(),
    ]);

  const contentGoals = filterContentGoals(goals);

  return (
    <CalendarPageClient
      projects={projects}
      tasks={tasks}
      goals={goals}
      milestones={milestones}
      contentPosts={contentPosts}
      standaloneEvents={standaloneEvents}
      contentGoals={contentGoals}
    />
  );
}
