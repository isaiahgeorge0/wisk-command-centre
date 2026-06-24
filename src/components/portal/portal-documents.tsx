"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileText, ImageIcon, Loader2 } from "lucide-react";
import { useTransition } from "react";

import { getPortalDocumentUrl } from "@/app/portal/actions";
import { PortalPage } from "@/components/portal/portal-page";
import { getPropertyDocumentTypeDisplayName } from "@/lib/properties/display-names";
import { formatPropertyDate } from "@/lib/properties/format";
import type { PropertyDocument } from "@/lib/properties/types";

type PortalDocumentsProps = {
  documents: PropertyDocument[];
};

function documentIcon(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return FileText;
  }
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(lower)) {
    return ImageIcon;
  }
  return FileText;
}

export function PortalDocuments({ documents }: PortalDocumentsProps) {
  const [isPending, startTransition] = useTransition();
  const reduced = useReducedMotion() ?? false;

  const handleView = (documentId: string) => {
    startTransition(async () => {
      const result = await getPortalDocumentUrl(documentId);
      if (result.success && result.data) {
        window.open(result.data, "_blank", "noopener,noreferrer");
      }
    });
  };

  return (
    <PortalPage>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--portal-text)]">
          Documents
        </h1>

        {documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--portal-amber)]/30 bg-[var(--portal-card)] px-6 py-14 text-center shadow-[var(--portal-shadow)]">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--portal-amber-light)]">
              <FileText className="size-7 text-[var(--portal-amber)]" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-[var(--portal-text)]">
              No documents shared yet
            </h2>
            <p className="mt-2 text-sm text-[var(--portal-muted)]">
              Your landlord will share important documents here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc, index) => {
              const Icon = documentIcon(doc.name);
              return (
                <motion.article
                  key={doc.id}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: reduced ? 0 : index * 0.05,
                  }}
                  className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-5 shadow-[var(--portal-shadow)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--portal-amber-light)]">
                      <Icon className="size-5 text-[var(--portal-amber)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-semibold text-[var(--portal-text)]">
                        {doc.name}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[var(--portal-amber-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--portal-amber)]">
                          {doc.document_type
                            ? getPropertyDocumentTypeDisplayName(
                                doc.document_type
                              )
                            : "Document"}
                        </span>
                        <span className="text-xs text-[var(--portal-muted)]">
                          {formatPropertyDate(doc.created_at)}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleView(doc.id)}
                        className="mt-4 min-h-12 rounded-xl border border-[var(--portal-border)] px-4 text-sm font-semibold text-[var(--portal-text)] transition-colors hover:bg-[var(--portal-border)]/40"
                      >
                        {isPending ? (
                          <Loader2 className="mx-auto size-4 animate-spin" />
                        ) : (
                          "View"
                        )}
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </PortalPage>
  );
}
