"use client";

import { Paperclip, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Attachments UI scaffold — replace placeholder + disabled button with a
 * working FileUpload component when Supabase Storage is enabled.
 */
export function TaskAttachmentsSection() {
  return (
    <section className="space-y-2" aria-label="Task attachments">
      <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Attachments
      </h4>
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-3">
        <Paperclip className="size-4 shrink-0 text-muted-foreground/70" />
        <p className="text-sm text-muted-foreground">
          File attachments coming soon.
        </p>
      </div>
      {/* Future: swap disabled button for <FileUpload taskId={...} /> */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className="gap-2 opacity-50"
        aria-disabled
      >
        <Upload className="size-4" />
        Upload file
      </Button>
    </section>
  );
}
