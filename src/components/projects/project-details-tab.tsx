"use client";

import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/projects/types";

type ProjectDetailsTabProps = {
  project: Project;
  showSiteUrl: boolean;
  showNotes: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function ProjectDetailsTab({
  project,
  showSiteUrl,
  showNotes,
  onEdit,
  onDelete,
}: ProjectDetailsTabProps) {
  return (
    <div className="space-y-3">
      {showSiteUrl && project.site_url?.trim() ? (
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
      {showNotes ? (
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-foreground">
            {project.notes?.trim() || "No notes yet."}
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
