"use client";

import { Lightbulb, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { DeleteIdeaDialog } from "@/components/ideas/delete-idea-dialog";
import { IdeaFiltersBar } from "@/components/ideas/idea-filters-bar";
import { IdeaFormDialog } from "@/components/ideas/idea-form-dialog";
import { IdeasEmptyState } from "@/components/ideas/ideas-empty-state";
import { IdeasList } from "@/components/ideas/ideas-list";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { Button } from "@/components/ui/button";
import { DEFAULT_IDEA_FILTERS } from "@/lib/ideas/constants";
import {
  applyIdeaFilters,
  countActiveIdeaFilters,
  getUniqueIdeaCategories,
} from "@/lib/ideas/selectors";
import type { Idea, IdeaFilters } from "@/lib/ideas/types";

type IdeasPageClientProps = {
  initialIdeas: Idea[];
};

export function IdeasPageClient({ initialIdeas }: IdeasPageClientProps) {
  const router = useRouter();
  const { ideaAddOpen, setIdeaAddOpen, openIdeaAdd } = useQuickAdd();
  const [ideas, setIdeas] = useState(initialIdeas);
  const [filters, setFilters] = useState<IdeaFilters>(DEFAULT_IDEA_FILTERS);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setIdeas(initialIdeas);
  }, [initialIdeas]);

  const categories = useMemo(() => getUniqueIdeaCategories(ideas), [ideas]);

  const filteredIdeas = useMemo(
    () => applyIdeaFilters(ideas, filters),
    [ideas, filters]
  );

  const isSearching = filters.search.trim().length > 0;
  const hasActiveFilters = countActiveIdeaFilters(filters) > 0;
  const showEmptyGroupMessages = !hasActiveFilters;

  const handleFiltersChange = useCallback((next: IdeaFilters) => {
    setFilters(next);
  }, []);

  const handleDeleted = useCallback(
    (id: string) => {
      setIdeas((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    },
    [router]
  );

  const handleDeleteRequest = useCallback((idea: Idea) => {
    setDeleteTarget({ id: idea.id, title: idea.title });
  }, []);

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          className="mb-0"
          title="Ideas"
          subtitle="Capture, explore, and convert your best thinking."
          icon={<Lightbulb className="size-6 text-wisk-section-ideas" />}
          accent="ideas"
        />
        <Button className="shrink-0 gap-2" onClick={openIdeaAdd}>
          <Plus className="size-4" />
          Add idea
        </Button>
      </div>

      {ideas.length === 0 ? (
        <IdeasEmptyState onAdd={openIdeaAdd} />
      ) : (
        <>
          <IdeaFiltersBar
            filters={filters}
            categories={categories}
            onChange={handleFiltersChange}
          />

          {filteredIdeas.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card/40 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {isSearching
                  ? `No ideas matching '${filters.search.trim()}'`
                  : "No ideas match your filters."}
              </p>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-muted-foreground"
                  onClick={() => handleFiltersChange(DEFAULT_IDEA_FILTERS)}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : (
            <IdeasList
              ideas={filteredIdeas}
              isSearching={isSearching}
              statusFilter={filters.status}
              showEmptyGroupMessages={showEmptyGroupMessages}
              onIdeaDelete={handleDeleteRequest}
            />
          )}
        </>
      )}

      <IdeaFormDialog open={ideaAddOpen} onOpenChange={setIdeaAddOpen} />

      <DeleteIdeaDialog
        ideaId={deleteTarget?.id ?? null}
        ideaTitle={deleteTarget?.title ?? ""}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </PageTransition>
  );
}
