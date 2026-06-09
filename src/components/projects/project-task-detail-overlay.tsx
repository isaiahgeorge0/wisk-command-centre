"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updateTask } from "@/app/(dashboard)/tasks/actions";
import { TaskAttachmentsSection } from "@/components/tasks/task-attachments-section";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { taskToFormInput } from "@/lib/tasks/form";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import type { ProjectOption, TaskFormInput, TaskWithProject } from "@/lib/tasks/types";

type ProjectTaskDetailOverlayProps = {
  task: TaskWithProject | null;
  projectId: string;
  projects: ProjectOption[];
  onClose: () => void;
  onUpdate: (task: TaskWithProject) => void;
};

export function ProjectTaskDetailOverlay({
  task,
  projectId,
  projects,
  onClose,
  onUpdate,
}: ProjectTaskDetailOverlayProps) {
  const router = useRouter();
  const { reduced } = useMotionSafe();
  const [values, setValues] = useState<TaskFormInput>(
    task ? taskToFormInput(task) : { title: "", priority: "medium" }
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = task ? `project-task-overlay-${task.id}` : "project-task-overlay";

  useEffect(() => {
    if (task) {
      setValues(taskToFormInput(task));
      setError(null);
    }
  }, [task]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setError(null);

    startTransition(async () => {
      const result = await updateTask(task.id, {
        ...values,
        project_id: projectId,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        onUpdate({
          ...result.data,
          project_name: task.project_name,
        });
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <AnimatePresence>
      {task ? (
        <motion.div
          key={task.id}
          className="absolute inset-0 z-20 flex flex-col rounded-xl bg-card/98 backdrop-blur-sm"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth }
          }
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Task: ${task.title}`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
            <p className="text-sm font-medium text-muted-foreground">Task detail</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close task detail"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>

          <form
            id={formId}
            onSubmit={handleSave}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <TaskForm
                formId={formId}
                values={values}
                onChange={setValues}
                projects={projects}
                disabled={isPending}
                compact
                hideProject
              />
              <TaskAttachmentsSection />
            </div>

            {error ? (
              <p className="px-4 text-sm text-destructive">{error}</p>
            ) : null}

            <div className="flex gap-2 border-t border-border/60 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
