"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import { IdeaCard } from "@/components/ideas/idea-card";
import { Button } from "@/components/ui/button";
import type { Idea } from "@/lib/ideas/types";
import type { IdeaStatus } from "@/lib/ideas/types";

type IdeasListProps = {
  ideas: Idea[];
  onIdeaDelete: (idea: Idea) => void;
};

function isStatus(idea: Idea, status: IdeaStatus): boolean {
  return (idea.status ?? "new") === status;
}

function IdeaGrid({
  ideas,
  onIdeaDelete,
}: {
  ideas: Idea[];
  onIdeaDelete: (idea: Idea) => void;
}) {
  if (ideas.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} onDelete={onIdeaDelete} />
      ))}
    </div>
  );
}

export function IdeasList({ ideas, onIdeaDelete }: IdeasListProps) {
  const [parkedExpanded, setParkedExpanded] = useState(false);

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

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          New & exploring
        </h2>
        {newAndExploring.length > 0 ? (
          <IdeaGrid ideas={newAndExploring} onIdeaDelete={onIdeaDelete} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No new or exploring ideas right now.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          In progress
        </h2>
        {inProgress.length > 0 ? (
          <IdeaGrid ideas={inProgress} onIdeaDelete={onIdeaDelete} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing in progress yet.
          </p>
        )}
      </section>

      {parkedDropped.length > 0 ? (
        <section className="border-t border-border/60 pt-6">
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

          {parkedExpanded ? (
            <IdeaGrid ideas={parkedDropped} onIdeaDelete={onIdeaDelete} />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
