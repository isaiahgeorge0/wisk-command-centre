"use client";

import { FileText, Loader2 } from "lucide-react";
import { useTransition } from "react";

import { getPortalDocumentUrl } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { getPropertyDocumentTypeDisplayName } from "@/lib/properties/display-names";
import { formatPropertyDate } from "@/lib/properties/format";
import type { PropertyDocument } from "@/lib/properties/types";

type PortalDocumentsProps = {
  documents: PropertyDocument[];
};

export function PortalDocuments({ documents }: PortalDocumentsProps) {
  const [isPending, startTransition] = useTransition();

  const handleView = (documentId: string) => {
    startTransition(async () => {
      const result = await getPortalDocumentUrl(documentId);
      if (result.success && result.data) {
        window.open(result.data, "_blank", "noopener,noreferrer");
      }
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-foreground">Documents</h1>

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-12 text-center">
          <FileText className="mx-auto mb-3 size-10 text-amber-500" />
          <p className="text-sm text-muted-foreground">
            Your landlord hasn&apos;t shared any documents yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <article
              key={doc.id}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{doc.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {doc.document_type
                    ? getPropertyDocumentTypeDisplayName(doc.document_type)
                    : "Document"}
                  {" · "}
                  {formatPropertyDate(doc.created_at)}
                </p>
              </div>
              <Button
                variant="outline"
                className="min-h-11 shrink-0"
                disabled={isPending}
                onClick={() => handleView(doc.id)}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "View"
                )}
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
