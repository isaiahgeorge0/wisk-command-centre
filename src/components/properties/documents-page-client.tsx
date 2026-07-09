"use client";

import { FileText } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { Badge } from "@/components/ui/badge";
import { PROPERTIES_ACCENT } from "@/lib/properties/constants";
import {
  getPropertyDocumentTypeDisplayName,
} from "@/lib/properties/display-names";
import { formatPropertyDate } from "@/lib/properties/format";
import type { PropertyDocument } from "@/lib/properties/types";

type PropertyDocumentsGroup = {
  propertyId: string;
  propertyName: string;
  documents: PropertyDocument[];
};

type DocumentsPageClientProps = {
  groups: PropertyDocumentsGroup[];
  hasProPlan: boolean;
};

export function DocumentsPageClient({
  groups,
  hasProPlan,
}: DocumentsPageClientProps) {
  const totalDocuments = groups.reduce(
    (sum, group) => sum + group.documents.length,
    0
  );

  return (
    <PageTransition>
      <PageHeader
        title="Documents"
        subtitle="Leases, certificates, and property files across your portfolio."
        icon={<FileText className="size-6" style={{ color: PROPERTIES_ACCENT }} />}
        className="mb-8"
      />

      {hasProPlan ? (
        <div className="mb-6">
          <span className="rounded-full border border-wisk-ferrari/20 bg-wisk-ferrari/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-wisk-ferrari">
            Properties Pro
          </span>
        </div>
      ) : null}

      {totalDocuments === 0 ? (
        <div className="rounded-xl border border-dashed border-wisk-ferrari/20 bg-card/40 px-6 py-16 text-center">
          <FileText className="mx-auto mb-4 size-10 text-wisk-ferrari" />
          <h2 className="text-lg font-medium text-foreground">No documents yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Documents are added from individual property pages.
          </p>
          <Link
            href="/properties/list"
            className="mt-5 inline-flex text-sm font-medium text-wisk-ferrari hover:text-wisk-ferrari/80"
          >
            Go to Properties
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section
              key={group.propertyId}
              className="rounded-xl border border-border/60 bg-card/40 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {group.propertyName}
                </h2>
                <Link
                  href={`/properties/${group.propertyId}?tab=documents`}
                  className="text-xs font-medium text-wisk-ferrari hover:text-wisk-ferrari/80"
                >
                  Open property documents
                </Link>
              </div>

              <div className="space-y-3">
                {group.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg border border-wisk-ferrari/15 bg-card/60 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{doc.name}</p>
                      {doc.document_type ? (
                        <Badge
                          variant="outline"
                          className="border-wisk-ferrari/30 bg-wisk-ferrari/10 text-wisk-ferrari"
                        >
                          {getPropertyDocumentTypeDisplayName(doc.document_type)}
                        </Badge>
                      ) : null}
                      {doc.shared_with_tenant ? (
                        <Badge
                          variant="outline"
                          className="border-wisk-ferrari/30 bg-wisk-ferrari/10 text-wisk-ferrari"
                        >
                          Shared with tenant
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Uploaded {formatPropertyDate(doc.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
