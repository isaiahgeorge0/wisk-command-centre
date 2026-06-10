"use client";

import { Flag, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  createMilestone,
  deleteMilestone,
  getMilestonesForProject,
  toggleMilestone,
} from "@/app/(dashboard)/projects/milestones/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatShortDueDate } from "@/lib/overview/date";
import type { ProjectMilestone } from "@/lib/projects/milestones/types";
import { cn } from "@/lib/utils";

type ProjectMilestonesTabProps = {
  projectId: string;
  active: boolean;
};

export function ProjectMilestonesTab({
  projectId,
  active,
}: ProjectMilestonesTabProps) {
  const router = useRouter();
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!active || loaded) return;

    let cancelled = false;
    setLoading(true);

    getMilestonesForProject(projectId)
      .then((data) => {
        if (cancelled) return;
        setMilestones(data);
        setLoaded(true);
      })
      .catch((err) => {
        console.error("getMilestonesForProject:", err);
        if (!cancelled) setLoaded(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, loaded, projectId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    startTransition(async () => {
      const result = await createMilestone(projectId, { title, date });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        setMilestones((prev) =>
          [...prev, result.data!].sort(
            (a, b) =>
              a.date.localeCompare(b.date) ||
              a.created_at.localeCompare(b.created_at)
          )
        );
      }
      setTitle("");
      setDate("");
      router.refresh();
    });
  };

  const handleToggle = (milestone: ProjectMilestone, completed: boolean) => {
    setMilestones((prev) =>
      prev.map((item) =>
        item.id === milestone.id ? { ...item, completed } : item
      )
    );

    startTransition(async () => {
      const result = await toggleMilestone(milestone.id, completed);
      if (!result.success) {
        setMilestones((prev) =>
          prev.map((item) =>
            item.id === milestone.id
              ? { ...item, completed: milestone.completed }
              : item
          )
        );
        return;
      }
      if (result.data) {
        setMilestones((prev) =>
          prev.map((item) => (item.id === milestone.id ? result.data! : item))
        );
      }
      router.refresh();
    });
  };

  const handleDelete = (milestoneId: string) => {
    setMilestones((prev) => prev.filter((item) => item.id !== milestoneId));

    startTransition(async () => {
      const result = await deleteMilestone(milestoneId);
      if (!result.success) {
        router.refresh();
      } else {
        router.refresh();
      }
    });
  };

  if (loading && !loaded) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Loading milestones…
      </p>
    );
  }

  return (
    <div>
      {milestones.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-8 text-center">
          <Flag className="mb-3 size-8 text-muted-foreground" aria-hidden />
          <h4 className="text-sm font-medium text-foreground">
            No milestones yet
          </h4>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Add milestones to track key dates and deliverables for this project.
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {milestones.map((milestone) => (
            <li
              key={milestone.id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40",
                milestone.completed && "opacity-70"
              )}
            >
              <Checkbox
                checked={milestone.completed}
                disabled={isPending}
                onCheckedChange={(checked) =>
                  handleToggle(milestone, checked === true)
                }
                onClick={(e) => e.stopPropagation()}
                aria-label={
                  milestone.completed
                    ? "Mark milestone incomplete"
                    : "Mark milestone complete"
                }
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm text-foreground",
                    milestone.completed &&
                      "line-through text-muted-foreground"
                  )}
                >
                  {milestone.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatShortDueDate(milestone.date)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                aria-label="Delete milestone"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(milestone.id);
                }}
              >
                <Trash2 className="size-3.5 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleCreate}
        onClick={(e) => e.stopPropagation()}
        className="mt-3 space-y-2 border-t border-border/50 pt-3"
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Milestone title"
            disabled={isPending}
            className="h-9"
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isPending}
            className="h-9"
            aria-label="Milestone date"
            required
          />
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <Button
          type="submit"
          size="sm"
          className="gap-1.5"
          disabled={isPending || !title.trim() || !date}
        >
          <Plus className="size-3.5" />
          Add milestone
        </Button>
      </form>
    </div>
  );
}
