"use client";

import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import { ProjectCard } from "@/components/projects/project-card";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import type { Project } from "@/lib/projects/types";
import type { TaskWithProject } from "@/lib/tasks/types";

type ProjectsListProps = {
  projects: Project[];
  tasks: TaskWithProject[];
  vercelConnected: boolean;
  githubConnected: boolean;
  onDelete: (project: Project) => void;
  onTaskUpdate: (task: TaskWithProject) => void;
  onTaskCreated: (task: TaskWithProject) => void;
  onTaskCreateFailed: (taskId: string) => void;
  onTaskCreateConfirmed: (tempId: string, task: TaskWithProject) => void;
};

export function ProjectsList({
  projects,
  tasks,
  vercelConnected,
  githubConnected,
  onDelete,
  onTaskUpdate,
  onTaskCreated,
  onTaskCreateFailed,
  onTaskCreateConfirmed,
}: ProjectsListProps) {
  const stagger = useStaggerOnce();

  return (
    <StaggerList
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      stagger={stagger}
    >
      {projects.map((project) => (
        <StaggerItem key={project.id} stagger={stagger}>
          <ProjectCard
            project={project}
            tasks={tasks}
            vercelConnected={vercelConnected}
            githubConnected={githubConnected}
            onDelete={onDelete}
            onTaskUpdate={onTaskUpdate}
            onTaskCreated={onTaskCreated}
            onTaskCreateFailed={onTaskCreateFailed}
            onTaskCreateConfirmed={onTaskCreateConfirmed}
          />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
