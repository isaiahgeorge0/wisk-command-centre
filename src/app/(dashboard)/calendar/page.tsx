import { getAllMilestones } from "@/app/(dashboard)/projects/milestones/actions";
import { getGoals } from "@/app/(dashboard)/goals/actions";
import { getProjects } from "@/app/(dashboard)/projects/actions";
import { getTasks } from "@/app/(dashboard)/tasks/actions";
import { CalendarPageClient } from "@/components/calendar/calendar-page-client";

export default async function CalendarPage() {
  const [projects, tasks, goals, milestones] = await Promise.all([
    getProjects(),
    getTasks(),
    getGoals(),
    getAllMilestones(),
  ]);

  return (
    <CalendarPageClient
      projects={projects}
      tasks={tasks}
      goals={goals}
      milestones={milestones}
    />
  );
}
