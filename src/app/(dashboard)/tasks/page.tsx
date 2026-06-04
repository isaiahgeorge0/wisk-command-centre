import { getProjectsForSelect, getTasks } from "@/app/(dashboard)/tasks/actions";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";

export default async function TasksPage() {
  const [tasks, projects] = await Promise.all([
    getTasks(),
    getProjectsForSelect(),
  ]);

  return <TasksPageClient initialTasks={tasks} projects={projects} />;
}
