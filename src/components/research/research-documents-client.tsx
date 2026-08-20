"use client";

import {
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  askResearchDocumentQuestionAction,
  deleteResearchDocument,
  getResearchDocumentThread,
  getResearchDocumentUrl,
  uploadResearchDocument,
} from "@/app/(dashboard)/research/documents/actions";
import { PageHeader } from "@/components/layout/page-header";
import {
  SectionIconChip,
  SectionSurface,
} from "@/components/overview/section-card";
import { useResearchAccent } from "@/components/research/use-research-accent";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  researchDocumentAcceptAttr,
  type ResearchDocument,
  type ResearchDocumentMessage,
} from "@/lib/research/documents-types";
import { cn } from "@/lib/utils";

type ResearchDocumentsClientProps = {
  documents: ResearchDocument[];
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResearchDocumentsClient({
  documents: initialDocuments,
}: ResearchDocumentsClientProps) {
  const accent = useResearchAccent();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDocuments[0]?.id ?? null
  );
  const [documentName, setDocumentName] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResearchDocument | null>(
    null
  );
  const [isDeleting, startDelete] = useTransition();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ResearchDocumentMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [threadError, setThreadError] = useState<string | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [asking, startAsk] = useTransition();

  const selected =
    documents.find((doc) => doc.id === selectedId) ?? documents[0] ?? null;

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  useEffect(() => {
    if (!selected || selected.status !== "ready") {
      setConversationId(null);
      setMessages([]);
      return;
    }

    let cancelled = false;
    setThreadLoading(true);
    setThreadError(null);

    void getResearchDocumentThread(selected.id).then((result) => {
      if (cancelled) return;
      setThreadLoading(false);
      if (!result.success || !result.data) {
        setThreadError(result.success ? null : result.error);
        setConversationId(null);
        setMessages([]);
        return;
      }
      setConversationId(result.data.conversationId || null);
      setMessages(result.data.messages);
    });

    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.status]);

  async function handleUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      if (documentName.trim()) {
        formData.set("name", documentName.trim());
      }

      const result = await uploadResearchDocument(formData);
      if (!result.success || !result.data) {
        setUploadError(result.success ? "Upload failed." : result.error);
        router.refresh();
        return;
      }

      setDocuments((current) => [result.data!, ...current]);
      setSelectedId(result.data.id);
      setDocumentName("");
      router.refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleAsk() {
    if (!selected || !question.trim()) return;
    setThreadError(null);
    const asked = question.trim();
    setQuestion("");

    startAsk(async () => {
      const result = await askResearchDocumentQuestionAction({
        documentId: selected.id,
        question: asked,
        conversationId: conversationId ?? undefined,
      });

      if (!result.success || !result.data) {
        setThreadError(result.success ? "Could not ask Winston." : result.error);
        setQuestion(asked);
        return;
      }

      setConversationId(result.data.conversationId);
      setMessages((current) => [
        ...current,
        result.data!.userMessage,
        result.data!.assistantMessage,
      ]);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Upload a brochure, contract, or report. Winston summarises it and answers follow-ups from that file only."
        accent="research"
        icon={
          <FileText className="size-5 text-wisk-section-research" aria-hidden />
        }
      />

      <SectionSurface accent={accent} cardId="research-documents-upload">
        <div className="flex items-start gap-3">
          <SectionIconChip accent={accent}>
            <Upload size={16} style={{ color: accent }} aria-hidden />
          </SectionIconChip>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">
              Upload a document
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, or TXT. Max 10MB. No web search — Winston reads the file
              itself.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Display name (optional)
            </label>
            <Input
              value={documentName}
              onChange={(event) => setDocumentName(event.target.value)}
              placeholder="Acme brochure Q2"
              disabled={uploading}
            />
          </div>

          <div
            className={cn(
              "rounded-xl border border-dashed border-border/70 bg-background/40 p-6 text-center transition-colors",
              dragOver && "border-wisk-section-research bg-wisk-section-research/5"
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void handleUpload(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={researchDocumentAcceptAttr()}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <p className="text-sm text-muted-foreground">
              Drag and drop a file here, or
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Reading…
                </>
              ) : (
                <>
                  <Upload className="size-3.5" aria-hidden />
                  Choose file
                </>
              )}
            </Button>
          </div>

          {uploadError ? (
            <p className="text-xs text-destructive">{uploadError}</p>
          ) : null}
        </div>
      </SectionSurface>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SectionSurface accent={accent} cardId="research-documents-list">
          <h2 className="text-sm font-semibold text-foreground">Your documents</h2>
          {documents.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No documents yet. Upload one to get a Winston summary.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {documents.map((doc) => {
                const active = selected?.id === doc.id;
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(doc.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-wisk-section-research/40 bg-wisk-section-research/10"
                          : "border-border/50 bg-background/40 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {doc.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {formatFileSize(doc.file_size)} ·{" "}
                            {new Date(doc.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                            {doc.status !== "ready" ? ` · ${doc.status}` : ""}
                          </p>
                        </div>
                        <FileText
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionSurface>

        <SectionSurface accent={accent} cardId="research-documents-detail">
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Select a document to see Winston&apos;s summary and ask follow-ups.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {selected.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Winston looked this over from the file text only.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const url = await getResearchDocumentUrl(selected.file_path);
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Open file
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => setDeleteTarget(selected)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Delete
                  </Button>
                </div>
              </div>

              {selected.status === "failed" ? (
                <p className="text-xs text-destructive">
                  {selected.error_message ?? "Analysis failed for this file."}
                </p>
              ) : null}

              {selected.summary ? (
                <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Summary
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {selected.summary}
                  </p>
                </div>
              ) : selected.status === "processing" ? (
                <p className="text-sm text-muted-foreground">Winston is reading…</p>
              ) : (
                <p className="text-sm text-muted-foreground">No summary yet.</p>
              )}

              {selected.status === "ready" ? (
                <div className="space-y-3 border-t border-border/50 pt-4">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Ask about this document
                  </p>
                  {threadLoading ? (
                    <p className="text-xs text-muted-foreground">Loading thread…</p>
                  ) : null}
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {messages.length === 0 && !threadLoading ? (
                      <p className="text-xs text-muted-foreground">
                        Ask a follow-up. Answers stay grounded in this file only.
                      </p>
                    ) : null}
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "rounded-lg px-3 py-2 text-xs leading-relaxed",
                          message.role === "user"
                            ? "bg-muted/40 text-foreground"
                            : "border border-border/50 bg-background/60 text-foreground"
                        )}
                      >
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {message.role === "user" ? "You" : "Winston"}
                        </p>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="What does this say about pricing?"
                      disabled={asking}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleAsk();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={asking || !question.trim()}
                      onClick={handleAsk}
                    >
                      {asking ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        "Ask"
                      )}
                    </Button>
                  </div>
                  {threadError ? (
                    <p className="text-xs text-destructive">{threadError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </SectionSurface>
      </div>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the file, summary, and its Winston Q&amp;A thread from
              Research. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                startDelete(async () => {
                  const result = await deleteResearchDocument(deleteTarget.id);
                  if (!result.success) {
                    setUploadError(result.error);
                    setDeleteTarget(null);
                    return;
                  }
                  setDocuments((current) =>
                    current.filter((doc) => doc.id !== deleteTarget.id)
                  );
                  if (selectedId === deleteTarget.id) {
                    setSelectedId(null);
                  }
                  setDeleteTarget(null);
                  router.refresh();
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
