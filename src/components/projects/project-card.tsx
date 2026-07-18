"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
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
import { ProjectTaskDetailOverlay } from "@/components/projects/project-task-detail-overlay";
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
import { getProjectClientLabel, getProjectDisplayName } from "@/lib/projects/display";
import { getProjectTaskStats } from "@/lib/projects/progress";
import type { Project, ProjectFormInput } from "@/lib/projects/types";
import type { TaskWithProject } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

type ProjectCardProps = {
  project: Project;
  tasks: TaskWithProject[];
  recentProjectTypes: string[];
  vercelConnected: boolean;
  githubConnected: boolean;
  onDelete: (project: Project) => void;
  onTaskUpdate: (task: TaskWithProject) => void;
  onTaskCreated: (task: TaskWithProject) => void;
  onTaskCreateFailed: (taskId: string) => void;
  onTaskCreateConfirmed: (tempId: string, task: TaskWithProject) => void;
  openOnMount?: boolean;
  initialTab?: ProjectCardTab;
};

export function ProjectCard({
  project,
  tasks,
  recentProjectTypes,
  vercelConnected,
  githubConnected,
  onDelete,
  onTaskUpdate,
  onTaskCreated,
  onTaskCreateFailed,
  onTaskCreateConfirmed,
  openOnMount = false,
  initialTab,
}: ProjectCardProps) {
  const { fieldVisibility, serviceTypes } = usePreferences();
  const vis = fieldVisibility.projects;
  const router = useRouter();
  const [expanded, setExpanded] = useState(openOnMount);
  const [activeTab, setActiveTab] = useState<ProjectCardTab>(
    initialTab ?? "details"
  );
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);
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
    if (editing || selectedTask) return;
    setExpanded((prev) => !prev);
  };

  const handleTaskUpdate = (task: TaskWithProject) => {
    onTaskUpdate(task);
    setSelectedTask((current) =>
      current?.id === task.id ? { ...task, project_name: current.project_name } : current
    );
  };

  const handleTaskSelect = (task: TaskWithProject) => {
    setSelectedTask(task);
    setActiveTab("tasks");
    setExpanded(true);
  };

  const handleTaskOverlayClose = () => {
    setSelectedTask(null);
    setActiveTab("tasks");
  };

  const projectOption = useMemo(
    () => [{ id: project.id, project_name: getProjectDisplayName(project) }],
    [project]
  );

  if (editing) {
    return (
      <Card className="border-wisk-section-projects/25 bg-card/90">
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
              projectTypeOptions={serviceTypes}
              recentProjectTypes={recentProjectTypes}
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
        "group relative cursor-pointer overflow-hidden border bg-card/60 transition-all duration-200 hover:bg-card/80",
        expanded
          ? "border-wisk-section-projects/40 shadow-[0_0_24px_-4px_rgba(172,160,255,0.15)]"
          : "border-border/60 hover:border-wisk-section-projects/30 hover:shadow-[0_0_20px_-4px_rgba(172,160,255,0.1)]"
      )}
      onClick={handleCardClick}
    >
      <div
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl transition-opacity duration-200"
        style={{
          background: "linear-gradient(to bottom, #aca0ff, #aca0ff80)",
          opacity: expanded ? 1 : 0.4,
        }}
      />

      {expanded && !selectedTask ? (
        <button
          type="button"
          aria-label="Collapse project"
          className="absolute top-3 right-3 z-10 text-muted-foreground transition-colors hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
        >
          <ChevronUp className="size-4" />
        </button>
      ) : null}

      <CardHeader className="gap-2 pb-2 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold tracking-tight text-foreground">
              {getProjectDisplayName(project)}
            </h3>
            {getProjectClientLabel(project) ? (
              <p className="truncate text-xs text-muted-foreground">
                for {getProjectClientLabel(project)}
              </p>
            ) : null}
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        {vis.serviceType ? (
          <div className="flex justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Project type
            </span>
            <span className="truncate text-right text-sm font-medium text-foreground">
              {project.service_type ?? "—"}
            </span>
          </div>
        ) : null}
        {vis.nextAction ? (
          <div className="flex justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Next
            </span>
            {project.next_action?.trim() ? (
              <span className="inline-block line-clamp-2 rounded-md bg-wisk-section-projects/8 px-2 py-0.5 text-right text-sm font-medium text-wisk-section-projects">
                {project.next_action.trim()}
              </span>
            ) : (
              <span className="line-clamp-2 text-right text-sm font-medium text-foreground/90">
                —
              </span>
            )}
          </div>
        ) : null}
        {vis.deadline ? (
          <div className="flex justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Deadline
            </span>
            <span className="truncate text-right text-sm font-medium text-foreground">
              {formatProjectDeadline(project.deadline)}
            </span>
          </div>
        ) : null}
        {vis.value ? (
          <div className="flex justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Value
            </span>
            <span className="truncate text-right text-sm font-medium tabular-nums text-foreground">
              {formatProjectValue(project.value)}
            </span>
          </div>
        ) : null}

        {taskStats.total >= 1 ? (
          <div className="mt-3 rounded-xl border border-wisk-section-projects/15 bg-wisk-section-projects/5 px-3 py-2.5">
            <ProjectTaskProgressBar
              completed={taskStats.completed}
              total={taskStats.total}
            />
          </div>
        ) : null}

        <ExpandableSection
          open={expanded}
          className="mt-3 space-y-3 border-t border-border/50 pt-3"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ProjectCardTabs
              activeTab={activeTab}
              onChange={(tab) => {
                setActiveTab(tab);
                if (tab !== "tasks") {
                  setSelectedTask(null);
                }
              }}
            />

            {activeTab === "details" ? (
              <ProjectDetailsTab
                project={project}
                showSiteUrl={vis.siteUrl}
                showNotes={vis.notes}
                expanded={expanded}
                vercelConnected={vercelConnected}
                githubConnected={githubConnected}
                onEdit={() => setEditing(true)}
                onDelete={() => onDelete(project)}
              />
            ) : null}

            {activeTab === "tasks" ? (
              <ProjectTasksTab
                projectId={project.id}
                tasks={projectTasks}
                onTaskUpdate={handleTaskUpdate}
                onTaskSelect={handleTaskSelect}
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
          <div className="flex items-center gap-1.5 pt-1 text-xs text-wisk-section-projects/60 transition-colors group-hover:text-wisk-section-projects/80">
            <span>View details</span>
            <ChevronDown className="size-3 transition-transform group-hover:translate-y-0.5" />
          </div>
        ) : null}
      </CardContent>

      <ProjectTaskDetailOverlay
        task={selectedTask}
        projectId={project.id}
        projects={projectOption}
        onClose={handleTaskOverlayClose}
        onUpdate={handleTaskUpdate}
      />
    </Card>
  );
}
