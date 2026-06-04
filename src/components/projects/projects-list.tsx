"use client";

import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import { ProjectCard } from "@/components/projects/project-card";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import type { Project } from "@/lib/projects/types";

type ProjectsListProps = {
  projects: Project[];
  onDelete: (project: Project) => void;
};

export function ProjectsList({ projects, onDelete }: ProjectsListProps) {
  const stagger = useStaggerOnce();

  return (
    <StaggerList
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      stagger={stagger}
    >
      {projects.map((project) => (
        <StaggerItem key={project.id} stagger={stagger}>
          <ProjectCard project={project} onDelete={onDelete} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
