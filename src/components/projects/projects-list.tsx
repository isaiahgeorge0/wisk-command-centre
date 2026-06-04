"use client";

import { ProjectCard } from "@/components/projects/project-card";
import type { Project } from "@/lib/projects/types";

type ProjectsListProps = {
  projects: Project[];
  onDelete: (project: Project) => void;
};

export function ProjectsList({ projects, onDelete }: ProjectsListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
