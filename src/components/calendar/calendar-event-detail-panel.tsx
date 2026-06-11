"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CalendarEventFormDialog } from "@/components/calendar/calendar-event-form-dialog";
import { useIsMobilePanel } from "@/components/calendar/use-is-mobile-panel";
import { ContentFormDialog } from "@/components/content/content-form-dialog";
import { ContentPlatformDots } from "@/components/content/content-platform-dots";
import { ContentStatusBadge } from "@/components/content/content-status-badge";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { GoalProgressBar } from "@/components/goals/goal-progress-bar";
import { ProjectEditFormDialog } from "@/components/projects/project-edit-form-dialog";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskDueDate } from "@/components/tasks/task-due-date";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TaskProjectTag } from "@/components/tasks/task-project-tag";
import { Button } from "@/components/ui/button";
import { formatProjectDeadline } from "@/lib/projects/format";
import { getPostPlatforms } from "@/lib/content/platforms";
import { CONTENT_TYPE_LABELS } from "@/lib/content/constants";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { StandaloneCalendarEvent } from "@/lib/calendar/types";
import type { ContentPost } from "@/lib/content/types";
import { formatGoalProgressLabel } from "@/lib/goals/format";
import type { Goal } from "@/lib/goals/types";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import type { ProjectMilestone } from "@/lib/projects/milestones/types";
import type { Project } from "@/lib/projects/types";
import type { ProjectOption, TaskWithProject } from "@/lib/tasks/types";

type CalendarEventDetailPanelProps = {
  selectedEvent: CalendarEvent | null;
  onClose: () => void;
  projects: Project[];
  tasks: TaskWithProject[];
  goals: Goal[];
  milestones: ProjectMilestone[];
  contentPosts: ContentPost[];
  standaloneEvents: StandaloneCalendarEvent[];
  projectOptions: ProjectOption[];
  contentGoals: Pick<Goal, "id" | "title">[];
  recentProjectTypes: string[];
};

function resolveContentPost(
  event: CalendarEvent,
  contentPosts: ContentPost[]
): ContentPost | null {
  const meta = typeof event.meta === "object" ? event.meta : null;
  if (meta?.post) {
    return meta.post as ContentPost;
  }
  const postId = event.id.split("-")[0];
  return contentPosts.find((post) => post.id === postId) ?? null;
}

function EventDetailBody({
  event,
  projects,
  tasks,
  goals,
  milestones,
  contentPosts,
  standaloneEvents,
  onEdit,
}: {
  event: CalendarEvent;
  projects: Project[];
  tasks: TaskWithProject[];
  goals: Goal[];
  milestones: ProjectMilestone[];
  contentPosts: ContentPost[];
  standaloneEvents: StandaloneCalendarEvent[];
  onEdit: () => void;
}) {
  if (event.type === "task") {
    const task = tasks.find((item) => item.id === event.id);
    if (!task) {
      return (
        <p className="text-sm text-muted-foreground">Task not found.</p>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <TaskPriorityBadge priority={task.priority} />
          <TaskDueDate dueDate={task.due_date} completed={task.completed} />
        </div>
        {task.project_name ? (
          <TaskProjectTag projectName={task.project_name} />
        ) : null}
        {task.raw_content ? (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {task.raw_content}
          </p>
        ) : null}
        <Button type="button" className="w-full" onClick={onEdit}>
          Edit task
        </Button>
      </div>
    );
  }

  if (event.type === "project") {
    const project = projects.find((item) => item.id === event.id);
    if (!project) {
      return (
        <p className="text-sm text-muted-foreground">Project not found.</p>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          {project.deadline ? (
            <span className="text-xs text-muted-foreground">
              {formatProjectDeadline(project.deadline)}
            </span>
          ) : null}
        </div>
        {project.client_name ? (
          <p className="text-sm text-muted-foreground">{project.client_name}</p>
        ) : null}
        {project.next_action ? (
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Next action
            </p>
            <p className="mt-1 text-sm">{project.next_action}</p>
          </div>
        ) : null}
        <Button type="button" className="w-full" onClick={onEdit}>
          Edit project
        </Button>
      </div>
    );
  }

  if (event.type === "goal") {
    const goal = goals.find((item) => item.id === event.id);
    if (!goal) {
      return (
        <p className="text-sm text-muted-foreground">Goal not found.</p>
      );
    }

    return (
      <div className="space-y-4">
        <GoalProgressBar current={goal.current} target={goal.target} />
        <p className="text-sm text-muted-foreground">
          {formatGoalProgressLabel(goal.current, goal.target, goal.unit)}
        </p>
        {goal.deadline ? (
          <p className="text-sm text-muted-foreground">
            Deadline: {formatProjectDeadline(goal.deadline)}
          </p>
        ) : null}
        <Button type="button" className="w-full" onClick={onEdit}>
          Edit goal
        </Button>
      </div>
    );
  }

  if (event.type === "milestone") {
    const milestone = milestones.find((item) => item.id === event.id);
    const meta =
      typeof event.meta === "object" ? event.meta : null;
    const projectName =
      (meta?.projectName as string | undefined) ??
      projects.find((p) => p.id === meta?.projectId)?.project_name;

    if (!milestone) {
      return (
        <p className="text-sm text-muted-foreground">Milestone not found.</p>
      );
    }

    return (
      <div className="space-y-4">
        {projectName ? (
          <p className="text-sm text-muted-foreground">{projectName}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Due: {formatProjectDeadline(milestone.date)}
        </p>
        <p className="text-sm text-muted-foreground">
          {milestone.completed ? "Completed" : "Not completed"}
        </p>
        <Button type="button" className="w-full" onClick={onEdit}>
          Edit milestone
        </Button>
      </div>
    );
  }

  if (event.type === "content") {
    const post = resolveContentPost(event, contentPosts);
    if (!post) {
      return (
        <p className="text-sm text-muted-foreground">Content not found.</p>
      );
    }

    const platforms = getPostPlatforms(post);
    const dateLabel = post.published_date
      ? `Published ${formatProjectDeadline(post.published_date)}`
      : post.scheduled_date
        ? `Scheduled ${formatProjectDeadline(post.scheduled_date)}`
        : null;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ContentPlatformDots platforms={platforms} />
          <ContentStatusBadge status={post.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {CONTENT_TYPE_LABELS[post.content_type as keyof typeof CONTENT_TYPE_LABELS] ??
            post.content_type}
        </p>
        {dateLabel ? (
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        ) : null}
        {post.hook ? (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {post.hook}
          </p>
        ) : null}
        <Button type="button" className="w-full" onClick={onEdit}>
          Edit post
        </Button>
      </div>
    );
  }

  if (event.type === "lifestyle" || event.type === "other") {
    const standalone = standaloneEvents.find((item) => item.id === event.id);
    const meta = typeof event.meta === "object" ? event.meta : null;
    const notes =
      standalone?.notes ?? (meta?.notes as string | undefined);

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {formatProjectDeadline(event.date)}
        </p>
        {notes ? (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {notes}
          </p>
        ) : null}
        <Button type="button" className="w-full" onClick={onEdit}>
          Edit
        </Button>
      </div>
    );
  }

  return null;
}

function EventDetailContent({
  selectedEvent,
  onClose,
  projects,
  tasks,
  goals,
  milestones,
  contentPosts,
  standaloneEvents,
  onEdit,
}: CalendarEventDetailPanelProps & { onEdit: () => void }) {
  if (!selectedEvent) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <h2 className="min-w-0 pr-2 text-sm font-semibold text-foreground">
          {selectedEvent.title}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close event details"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <EventDetailBody
          event={selectedEvent}
          projects={projects}
          tasks={tasks}
          goals={goals}
          milestones={milestones}
          contentPosts={contentPosts}
          standaloneEvents={standaloneEvents}
          onEdit={onEdit}
        />
      </div>
    </div>
  );
}

export function CalendarEventDetailPanel({
  selectedEvent,
  onClose,
  projects,
  tasks,
  goals,
  milestones,
  contentPosts,
  standaloneEvents,
  projectOptions,
  contentGoals,
  recentProjectTypes,
}: CalendarEventDetailPanelProps) {
  const router = useRouter();
  const { reduced, transition } = useMotionSafe();
  const isMobile = useIsMobilePanel();
  const open = Boolean(selectedEvent);

  const [editTask, setEditTask] = useState<TaskWithProject | null>(null);
  const [editContent, setEditContent] = useState<ContentPost | null>(null);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editStandalone, setEditStandalone] =
    useState<StandaloneCalendarEvent | null>(null);

  const handleEdit = useCallback(() => {
    if (!selectedEvent) return;

    if (selectedEvent.type === "task") {
      const task = tasks.find((item) => item.id === selectedEvent.id);
      if (task) setEditTask(task);
      return;
    }

    if (selectedEvent.type === "project") {
      const project = projects.find((item) => item.id === selectedEvent.id);
      if (project) setEditProject(project);
      return;
    }

    if (selectedEvent.type === "goal") {
      const goal = goals.find((item) => item.id === selectedEvent.id);
      if (goal) setEditGoal(goal);
      return;
    }

    if (selectedEvent.type === "milestone") {
      const meta =
        typeof selectedEvent.meta === "object" ? selectedEvent.meta : null;
      const projectId = meta?.projectId as string | undefined;
      if (projectId) {
        onClose();
        router.push(`/projects?project=${projectId}&tab=milestones`);
      }
      return;
    }

    if (selectedEvent.type === "content") {
      const post = resolveContentPost(selectedEvent, contentPosts);
      if (post) setEditContent(post);
      return;
    }

    if (selectedEvent.type === "lifestyle" || selectedEvent.type === "other") {
      const standalone = standaloneEvents.find(
        (item) => item.id === selectedEvent.id
      );
      if (standalone) setEditStandalone(standalone);
    }
  }, [
    selectedEvent,
    tasks,
    projects,
    goals,
    contentPosts,
    standaloneEvents,
    onClose,
    router,
  ]);

  useEffect(() => {
    if (!open || !isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isMobile]);

  const panelContent =
    selectedEvent ? (
      <EventDetailContent
        selectedEvent={selectedEvent}
        onClose={onClose}
        projects={projects}
        tasks={tasks}
        goals={goals}
        milestones={milestones}
        contentPosts={contentPosts}
        standaloneEvents={standaloneEvents}
        projectOptions={projectOptions}
        contentGoals={contentGoals}
        recentProjectTypes={recentProjectTypes}
        onEdit={handleEdit}
      />
    ) : null;

  const editDialogs = (
    <>
      <TaskFormDialog
        open={editTask !== null}
        onOpenChange={(next) => {
          if (!next) setEditTask(null);
        }}
        projects={projectOptions}
        task={editTask}
      />
      <ContentFormDialog
        open={editContent !== null}
        onOpenChange={(next) => {
          if (!next) setEditContent(null);
        }}
        contentGoals={contentGoals}
        post={editContent}
      />
      <GoalFormDialog
        open={editGoal !== null}
        onOpenChange={(next) => {
          if (!next) setEditGoal(null);
        }}
        goal={editGoal}
      />
      <ProjectEditFormDialog
        open={editProject !== null}
        onOpenChange={(next) => {
          if (!next) setEditProject(null);
        }}
        project={editProject}
        recentProjectTypes={recentProjectTypes}
      />
      <CalendarEventFormDialog
        open={editStandalone !== null}
        onOpenChange={(next) => {
          if (!next) setEditStandalone(null);
        }}
        event={editStandalone}
      />
    </>
  );

  if (isMobile) {
    if (!open || !selectedEvent) {
      return <>{editDialogs}</>;
    }

    return (
      <>
        <button
          type="button"
          aria-label="Close event details"
          className="fixed inset-0 z-40 bg-black/10 supports-backdrop-filter:backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
        <div className="fixed inset-x-0 bottom-0 z-50 flex min-h-[60vh] max-h-[85dvh] flex-col overflow-y-auto rounded-t-2xl border-t border-border/60 bg-popover pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg md:hidden">
          {panelContent}
        </div>
        {editDialogs}
      </>
    );
  }

  return (
    <div className="relative hidden h-full min-h-[24rem] md:block md:min-w-[20rem] md:max-w-[20rem] md:flex-1">
      <AnimatePresence mode="wait">
        {open && selectedEvent ? (
          <motion.aside
            key={selectedEvent.id}
            initial={reduced ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: 24 }}
            transition={
              reduced
                ? { duration: 0 }
                : {
                    duration: MOTION_DURATION.normal,
                    ease: MOTION_EASE.smooth,
                  }
            }
            className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40"
          >
            {panelContent}
          </motion.aside>
        ) : (
          <motion.div
            key="event-placeholder"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className="flex h-full min-h-[24rem] items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/20 px-6 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Select an event to view details.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {editDialogs}
    </div>
  );
}
