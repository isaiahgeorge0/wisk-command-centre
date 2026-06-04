"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PageTransition } from "@/components/layout/page-transition";
import { DeleteIdeaDialog } from "@/components/ideas/delete-idea-dialog";
import { IdeaFormDialog } from "@/components/ideas/idea-form-dialog";
import { IdeasEmptyState } from "@/components/ideas/ideas-empty-state";
import { IdeasList } from "@/components/ideas/ideas-list";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { Button } from "@/components/ui/button";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";
import type { Idea } from "@/lib/ideas/types";

type IdeasPageClientProps = {
  initialIdeas: Idea[];
};

export function IdeasPageClient({ initialIdeas }: IdeasPageClientProps) {
  const router = useRouter();
  const { ideaAddOpen, setIdeaAddOpen, openIdeaAdd } = useQuickAdd();
  const [ideas, setIdeas] = useState(initialIdeas);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setIdeas(initialIdeas);
  }, [initialIdeas]);

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
        <div>
          <h1 className={PAGE_TITLE_CLASS}>Ideas</h1>
          <p className={PAGE_SUBTITLE_CLASS}>
            A scratchpad for what to build, test, or explore next.
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={openIdeaAdd}>
          <Plus className="size-4" />
          Add idea
        </Button>
      </div>

      {ideas.length === 0 ? (
        <IdeasEmptyState onAdd={openIdeaAdd} />
      ) : (
        <IdeasList ideas={ideas} onIdeaDelete={handleDeleteRequest} />
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
