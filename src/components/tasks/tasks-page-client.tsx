"use client";

import { CheckSquare, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { TaskFiltersBar } from "@/components/tasks/task-filters-bar";
import { TasksEmptyState } from "@/components/tasks/tasks-empty-state";
import { TasksList } from "@/components/tasks/tasks-list";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { Button } from "@/components/ui/button";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";
import { DEFAULT_TASK_FILTERS } from "@/lib/tasks/constants";
import { applyTaskFilters } from "@/lib/tasks/selectors";
import type { ProjectOption, TaskFilters, TaskWithProject } from "@/lib/tasks/types";

type TasksPageClientProps = {
  initialTasks: TaskWithProject[];
  projects: ProjectOption[];
};

export function TasksPageClient({
  initialTasks,
  projects,
}: TasksPageClientProps) {
  const router = useRouter();
  const { openTaskAdd } = useQuickAdd();
  const [tasks, setTasks] = useState(initialTasks);
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_TASK_FILTERS);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleFiltersChange = useCallback((next: TaskFilters) => {
    setFilters(next);
  }, []);

  const filteredTasks = useMemo(
    () => applyTaskFilters(tasks, filters),
    [tasks, filters]
  );
  const incompleteTasks = useMemo(
    () => filteredTasks.filter((t) => !t.completed),
    [filteredTasks]
  );
  const completedTasks = useMemo(
    () => filteredTasks.filter((t) => t.completed),
    [filteredTasks]
  );

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
        <PageHeader
          className="mb-0"
          title="Tasks"
          subtitle="What needs doing, by when, and for which client."
          icon={
            <CheckSquare className="size-6" style={{ color: "#6366f1" }} />
          }
          accentColour="#6366f1"
        />
        <Button className="shrink-0 gap-2" onClick={() => openTaskAdd()}>
          <Plus className="size-4" />
          Add task
        </Button>
      </div>

      {initialTasks.length === 0 ? (
        <TasksEmptyState onAdd={() => openTaskAdd()} />
      ) : (
        <>
          <TaskFiltersBar
            filters={filters}
            projects={projects}
            onChange={handleFiltersChange}
          />
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card/40 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No tasks match your filters.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 text-muted-foreground"
                onClick={() => handleFiltersChange(DEFAULT_TASK_FILTERS)}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <TasksList
              tasks={[...incompleteTasks, ...completedTasks]}
              projects={projects}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleDeleteRequest}
            />
          )}
        </>
      )}

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
