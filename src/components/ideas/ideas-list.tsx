"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import { IdeaCard } from "@/components/ideas/idea-card";
import { Button } from "@/components/ui/button";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import { normalizeIdeaStatus } from "@/lib/ideas/selectors";
import type { Idea } from "@/lib/ideas/types";
import type { IdeaStatus, IdeaStatusFilter } from "@/lib/ideas/types";

type IdeasListProps = {
  ideas: Idea[];
  isSearching: boolean;
  statusFilter: IdeaStatusFilter;
  showEmptyGroupMessages: boolean;
  onIdeaDelete: (idea: Idea) => void;
};

function isStatus(idea: Idea, status: IdeaStatus): boolean {
  return normalizeIdeaStatus(idea.status) === status;
}

function IdeaGrid({
  ideas,
  onIdeaDelete,
  stagger,
}: {
  ideas: Idea[];
  onIdeaDelete: (idea: Idea) => void;
  stagger: boolean;
}) {
  if (ideas.length === 0) {
    return null;
  }

  return (
    <StaggerList
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      stagger={stagger}
    >
      {ideas.map((idea) => (
        <StaggerItem key={idea.id} stagger={stagger}>
          <IdeaCard idea={idea} onDelete={onIdeaDelete} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}

export function IdeasList({
  ideas,
  isSearching,
  statusFilter,
  showEmptyGroupMessages,
  onIdeaDelete,
}: IdeasListProps) {
  const searchStagger = useStaggerOnce();
  const newStagger = useStaggerOnce();
  const progressStagger = useStaggerOnce();
  const parkedStagger = useStaggerOnce();
  const [parkedExpanded, setParkedExpanded] = useState(false);

  const autoExpandParked =
    statusFilter === "parked" || statusFilter === "dropped";

  useEffect(() => {
    if (autoExpandParked) {
      setParkedExpanded(true);
    }
  }, [autoExpandParked]);

  const { newAndExploring, inProgress, parkedDropped } = useMemo(() => {
    const newAndExploringIdeas: Idea[] = [];
    const inProgressIdeas: Idea[] = [];
    const parkedDroppedIdeas: Idea[] = [];

    for (const idea of ideas) {
      if (isStatus(idea, "new") || isStatus(idea, "exploring")) {
        newAndExploringIdeas.push(idea);
      } else if (isStatus(idea, "in-progress")) {
        inProgressIdeas.push(idea);
      } else if (isStatus(idea, "parked") || isStatus(idea, "dropped")) {
        parkedDroppedIdeas.push(idea);
      } else {
        newAndExploringIdeas.push(idea);
      }
    }

    return {
      newAndExploring: newAndExploringIdeas,
      inProgress: inProgressIdeas,
      parkedDropped: parkedDroppedIdeas,
    };
  }, [ideas]);

  if (isSearching) {
    return (
      <IdeaGrid
        ideas={ideas}
        onIdeaDelete={onIdeaDelete}
        stagger={searchStagger}
      />
    );
  }

  const showNewSection =
    statusFilter === "all" ||
    statusFilter === "new" ||
    statusFilter === "exploring";
  const showProgressSection =
    statusFilter === "all" || statusFilter === "in-progress";
  const showParkedSection =
    statusFilter === "all" ||
    statusFilter === "parked" ||
    statusFilter === "dropped";

  return (
    <div className="space-y-8">
      {showNewSection && newAndExploring.length > 0 ? (
        <section>
          <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
            New & exploring
          </h2>
          <IdeaGrid
            ideas={newAndExploring}
            onIdeaDelete={onIdeaDelete}
            stagger={newStagger}
          />
        </section>
      ) : showNewSection && showEmptyGroupMessages ? (
        <section>
          <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
            New & exploring
          </h2>
          <p className="text-sm text-muted-foreground">
            No new or exploring ideas right now.
          </p>
        </section>
      ) : null}

      {showProgressSection && inProgress.length > 0 ? (
        <section>
          <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
            In progress
          </h2>
          <IdeaGrid
            ideas={inProgress}
            onIdeaDelete={onIdeaDelete}
            stagger={progressStagger}
          />
        </section>
      ) : showProgressSection && showEmptyGroupMessages ? (
        <section>
          <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
            In progress
          </h2>
          <p className="text-sm text-muted-foreground">
            Nothing in progress yet.
          </p>
        </section>
      ) : null}

      {showParkedSection && parkedDropped.length > 0 ? (
        <section className="border-t border-border/60 pt-6">
          {statusFilter === "all" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-4 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setParkedExpanded((prev) => !prev)}
            >
              {parkedExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              {parkedExpanded
                ? "Hide parked & dropped"
                : `Show parked & dropped (${parkedDropped.length})`}
            </Button>
          ) : (
            <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
              Parked & dropped
            </h2>
          )}

          {parkedExpanded || statusFilter !== "all" ? (
            <IdeaGrid
              ideas={parkedDropped}
              onIdeaDelete={onIdeaDelete}
              stagger={parkedStagger}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
