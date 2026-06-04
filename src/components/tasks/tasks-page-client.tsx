"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PageTransition } from "@/components/layout/page-transition";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TasksEmptyState } from "@/components/tasks/tasks-empty-state";
import { TasksList } from "@/components/tasks/tasks-list";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { Button } from "@/components/ui/button";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";
import type { ProjectOption, TaskWithProject } from "@/lib/tasks/types";

type TasksPageClientProps = {
  initialTasks: TaskWithProject[];
  projects: ProjectOption[];
};

export function TasksPageClient({
  initialTasks,
  projects,
}: TasksPageClientProps) {
  const router = useRouter();
  const { taskAddOpen, setTaskAddOpen, openTaskAdd } = useQuickAdd();
  const [tasks, setTasks] = useState(initialTasks);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleTaskUpdate = useCallback((updated: TaskWithProject) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  }, []);

  const handleDeleted = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    },
    [router]
  );

  const handleDeleteRequest = useCallback((task: TaskWithProject) => {
    setDeleteTarget({ id: task.id, title: task.title });
  }, []);

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={PAGE_TITLE_CLASS}>Tasks</h1>
          <p className={PAGE_SUBTITLE_CLASS}>
            What needs doing, by when, and for which client.
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={openTaskAdd}>
          <Plus className="size-4" />
          Add task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <TasksEmptyState onAdd={openTaskAdd} />
      ) : (
        <TasksList
          tasks={tasks}
          projects={projects}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleDeleteRequest}
        />
      )}

      <TaskFormDialog
        open={taskAddOpen}
        onOpenChange={setTaskAddOpen}
        projects={projects}
      />

      <DeleteTaskDialog
        taskId={deleteTarget?.id ?? null}
        taskTitle={deleteTarget?.title ?? ""}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </PageTransition>
  );
}
