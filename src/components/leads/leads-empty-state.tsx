"use client";

import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

type LeadsEmptyStateProps = {
  onAdd: () => void;
};

export function LeadsEmptyState({ onAdd }: LeadsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted/60 ring-1 ring-border/60">
        <UserPlus className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-medium text-foreground">No leads yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Track enquiries from TikTok, referrals, your website, and more — then
        move them through your pipeline to won or lost.
      </p>
      <Button className="mt-6 gap-2" onClick={onAdd}>
        <UserPlus className="size-4" />
        Add your first lead
      </Button>
    </div>
  );
}
