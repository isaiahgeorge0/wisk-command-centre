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
      <Card className="border-wisk-purple/25 bg-card/90">
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
          "cursor-pointer border-border/60 bg-card/80 transition-colors hover:border-border hover:bg-card",
          expanded && "border-wisk-purple/20"
        )}
        onClick={handleCardClick}
      >
      <CardHeader className="gap-2 pb-2">
        <h3 className="line-clamp-1 text-base font-semibold text-foreground">
          {idea.title}
        </h3>
        {(vis.categoryTag || vis.statusBadge) ? (
          <div className="flex flex-wrap items-center gap-2">
            {vis.categoryTag ? (
              <IdeaCategoryTag category={idea.category} />
            ) : null}
            {vis.statusBadge ? (
              <IdeaStatusBadge status={idea.status} />
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="pt-0">
        {!expanded ? (
          <p
            className={cn(
              "line-clamp-2 text-sm",
              descriptionPreview
                ? "text-muted-foreground"
                : "text-muted-foreground/70 italic"
            )}
          >
            {descriptionPreview || "No description yet."}
          </p>
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

      {!expanded ? (
        <CardFooter className="pt-0 pb-3">
          <p className="text-xs text-muted-foreground">Click to expand</p>
        </CardFooter>
      ) : null}
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
