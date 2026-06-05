"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { updateProject } from "@/app/(dashboard)/projects/actions";
import { ExpandableSection } from "@/components/motion/expandable-section";
import { usePreferences } from "@/components/preferences/preferences-context";
import { ProjectCardTabs, type ProjectCardTab } from "@/components/projects/project-card-tabs";
import { ProjectDetailsTab } from "@/components/projects/project-details-tab";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectMilestonesTab } from "@/components/projects/project-milestones-tab";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectTaskProgressBar } from "@/components/projects/project-task-progress-bar";
import { ProjectTasksTab } from "@/components/projects/project-tasks-tab";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  formatProjectDeadline,
  formatProjectValue,
} from "@/lib/projects/format";
import { projectToFormInput } from "@/lib/projects/form";
import { getProjectTaskStats } from "@/lib/projects/progress";
import type { Project, ProjectFormInput } from "@/lib/projects/types";
import type { TaskWithProject } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

type ProjectCardProps = {
  project: Project;
  tasks: TaskWithProject[];
  onDelete: (project: Project) => void;
  onTaskUpdate: (task: TaskWithProject) => void;
  onTaskCreated: (task: TaskWithProject) => void;
  onTaskCreateFailed: (taskId: string) => void;
  onTaskCreateConfirmed: (tempId: string, task: TaskWithProject) => void;
};

export function ProjectCard({
  project,
  tasks,
  onDelete,
  onTaskUpdate,
  onTaskCreated,
  onTaskCreateFailed,
  onTaskCreateConfirmed,
}: ProjectCardProps) {
  const { fieldVisibility, serviceTypes } = usePreferences();
  const vis = fieldVisibility.projects;
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectCardTab>("details");
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<ProjectFormInput>(
    projectToFormInput(project)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = `edit-project-${project.id}`;

  const projectTasks = useMemo(
    () => tasks.filter((task) => task.project_id === project.id),
    [tasks, project.id]
  );

  const taskStats = useMemo(
    () => getProjectTaskStats(tasks, project.id),
    [tasks, project.id]
  );

  const cancelEdit = () => {
    setValues(projectToFormInput(project));
    setError(null);
    setEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateProject(project.id, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  const handleCardClick = () => {
    if (editing) return;
    setExpanded((prev) => !prev);
  };

  if (editing) {
    return (
      <Card className="border-wisk-purple/25 bg-card/90">
        <CardHeader className="pb-2">
          <p className="text-sm font-medium text-muted-foreground">
            Editing project
          </p>
        </CardHeader>
        <CardContent>
          <form id={formId} onSubmit={handleSave}>
            <ProjectForm
              formId={formId}
              values={values}
              onChange={setValues}
              serviceTypeOptions={serviceTypes}
              disabled={isPending}
            />
            {error ? (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            ) : null}
          </form>
        </CardContent>
        <CardFooter className="gap-2 border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cancelEdit}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "cursor-pointer border-border/60 bg-card/80 transition-colors hover:border-border hover:bg-card",
        expanded && "border-wisk-purple/20"
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="gap-2 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-foreground">
              {project.client_name}
            </h3>
            {vis.serviceType ? (
              <p className="truncate text-sm text-muted-foreground">
                {project.service_type ?? "—"}
              </p>
            ) : null}
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        {vis.nextAction ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Next</span>
            <span className="line-clamp-2 text-right text-foreground">
              {project.next_action?.trim() || "—"}
            </span>
          </div>
        ) : null}
        {vis.deadline ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Deadline</span>
            <span>{formatProjectDeadline(project.deadline)}</span>
          </div>
        ) : null}
        {vis.value ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Value</span>
            <span className="font-medium tabular-nums">
              {formatProjectValue(project.value)}
            </span>
          </div>
        ) : null}

        {taskStats.total >= 1 ? (
          <ProjectTaskProgressBar
            completed={taskStats.completed}
            total={taskStats.total}
          />
        ) : null}

        <ExpandableSection
          open={expanded}
          className="mt-3 space-y-3 border-t border-border/50 pt-3"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ProjectCardTabs
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            {activeTab === "details" ? (
              <ProjectDetailsTab
                project={project}
                showSiteUrl={vis.siteUrl}
                showNotes={vis.notes}
                onEdit={() => setEditing(true)}
                onDelete={() => onDelete(project)}
              />
            ) : null}

            {activeTab === "tasks" ? (
              <ProjectTasksTab
                projectId={project.id}
                tasks={projectTasks}
                onTaskUpdate={onTaskUpdate}
                onTaskCreated={onTaskCreated}
                onTaskCreateFailed={onTaskCreateFailed}
                onTaskCreateConfirmed={onTaskCreateConfirmed}
              />
            ) : null}

            {activeTab === "milestones" ? (
              <ProjectMilestonesTab
                projectId={project.id}
                active={activeTab === "milestones"}
              />
            ) : null}
          </div>
        </ExpandableSection>
        {!expanded ? (
          <p className="pt-1 text-xs text-muted-foreground">
            Click to expand details
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
