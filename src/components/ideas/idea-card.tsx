"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateIdea } from "@/app/(dashboard)/ideas/actions";
import { ExpandableSection } from "@/components/motion/expandable-section";
import { usePreferences } from "@/components/preferences/preferences-context";
import { ConvertIdeaDialog } from "@/components/ideas/convert-idea-dialog";
import { IdeaCategoryTag } from "@/components/ideas/idea-category-tag";
import { IdeaForm } from "@/components/ideas/idea-form";
import { IdeaStatusBadge } from "@/components/ideas/idea-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ideaToFormInput } from "@/lib/ideas/form";
import type { Idea, IdeaFormInput } from "@/lib/ideas/types";
import { cn } from "@/lib/utils";

type IdeaCardProps = {
  idea: Idea;
  onDelete: (idea: Idea) => void;
};

export function IdeaCard({ idea, onDelete }: IdeaCardProps) {
  const { fieldVisibility } = usePreferences();
  const vis = fieldVisibility.ideas;
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<IdeaFormInput>(ideaToFormInput(idea));
  const [error, setError] = useState<string | null>(null);
  const [convertMode, setConvertMode] = useState<"project" | "content" | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const formId = `edit-idea-${idea.id}`;

  const cancelEdit = () => {
    setValues(ideaToFormInput(idea));
    setError(null);
    setEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateIdea(idea.id, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setExpanded(false);
      router.refresh();
    });
  };

  const handleCardClick = () => {
    if (editing) return;
    setExpanded((prev) => !prev);
  };

  const descriptionPreview = idea.description?.trim();

  if (editing) {
    return (
      <Card className="border-wisk-section-ideas/25 bg-card/90">
        <CardHeader className="pb-2">
          <p className="text-sm font-medium text-muted-foreground">Editing idea</p>
        </CardHeader>
        <CardContent>
          <form id={formId} onSubmit={handleSave}>
            <IdeaForm
              formId={formId}
              values={values}
              onChange={setValues}
              disabled={isPending}
              compact
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
    <>
      <Card
        className={cn(
          "group relative cursor-pointer overflow-hidden",
          "bg-card/60 transition-all duration-200",
          "border hover:bg-card/80 hover:shadow-sm",
          expanded
            ? "border-wisk-section-ideas/40 shadow-[0_0_20px_-4px_rgba(254,169,224,0.12)]"
            : "border-border/60 hover:border-wisk-section-ideas/25"
        )}
        onClick={handleCardClick}
      >
        {/* Pink accent strip */}
        <div
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl"
          style={{
            background: "linear-gradient(to right, #fea9e0, #fea9e080)",
            opacity: expanded ? 1 : 0.5,
          }}
        />
        <CardHeader className="gap-1.5 pb-2 pt-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 flex-1 text-sm font-bold tracking-tight text-foreground">
              {idea.title}
            </h3>
            <span className="mt-0.5 shrink-0 text-[10px] text-muted-foreground/50 tabular-nums">
              {idea.created_at
                ? new Date(idea.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })
                : null}
            </span>
          </div>
          {(vis.categoryTag || vis.statusBadge) ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {vis.categoryTag ? (
                <IdeaCategoryTag category={idea.category} />
              ) : null}
              {vis.statusBadge ? (
                <IdeaStatusBadge status={idea.status} />
              ) : null}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="pt-0 pb-4">
          {!expanded ? (
            <>
              <p
                className={cn(
                  "line-clamp-3 text-sm leading-relaxed",
                  descriptionPreview
                    ? "text-foreground/70"
                    : "text-muted-foreground/50 italic"
                )}
              >
                {descriptionPreview || "No description yet — tap to add one."}
              </p>
              <p className="mt-3 text-xs text-wisk-section-ideas/50 transition-colors group-hover:text-wisk-section-ideas/70">
                Tap to expand →
              </p>
            </>
          ) : null}
          <ExpandableSection open={expanded}>
            <div onClick={(e) => e.stopPropagation()}>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {descriptionPreview || "No description yet."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
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
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConvertMode("project");
                  }}
                >
                  To project
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConvertMode("content");
                  }}
                >
                  To content
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(idea)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </ExpandableSection>
        </CardContent>
      </Card>

      <ConvertIdeaDialog
        idea={idea}
        mode={convertMode ?? "project"}
        open={convertMode !== null}
        onOpenChange={(open) => {
          if (!open) setConvertMode(null);
        }}
        onConverted={() => {
          setConvertMode(null);
          router.refresh();
        }}
      />
    </>
  );
}
