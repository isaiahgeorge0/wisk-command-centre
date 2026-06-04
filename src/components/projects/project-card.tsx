"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateProject } from "@/app/projects/actions";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
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
import type { Project, ProjectFormInput } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type ProjectCardProps = {
  project: Project;
  onDelete: (project: Project) => void;
};

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<ProjectFormInput>(
    projectToFormInput(project)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = `edit-project-${project.id}`;

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
            <p className="truncate text-sm text-muted-foreground">
              {project.service_type ?? "—"}
            </p>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Next</span>
          <span className="line-clamp-2 text-right text-foreground">
            {project.next_action?.trim() || "—"}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Deadline</span>
          <span>{formatProjectDeadline(project.deadline)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Value</span>
          <span className="font-medium tabular-nums">
            {formatProjectValue(project.value)}
          </span>
        </div>

        {expanded ? (
          <div
            className="mt-3 space-y-2 border-t border-border/50 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            {project.site_url?.trim() ? (
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Site URL
                </p>
                <a
                  href={
                    project.site_url.startsWith("http")
                      ? project.site_url
                      : `https://${project.site_url}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block truncate text-sm text-wisk-teal hover:underline"
                >
                  {project.site_url}
                </a>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">
                {project.notes?.trim() || "No notes yet."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setExpanded(true);
                  setEditing(true);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onDelete(project)}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <p className="pt-1 text-xs text-muted-foreground">
            Click to expand details
          </p>
        )}
      </CardContent>
    </Card>
  );
}
