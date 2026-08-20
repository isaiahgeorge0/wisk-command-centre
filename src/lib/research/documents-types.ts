import type { ActionResult } from "@/lib/leads/types";

export const RESEARCH_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const RESEARCH_DOCUMENT_ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export type ResearchDocumentMime =
  (typeof RESEARCH_DOCUMENT_ALLOWED_MIME)[number];

export type ResearchDocumentStatus = "processing" | "ready" | "failed";

export type ResearchDocument = {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  extracted_text: string | null;
  summary: string | null;
  status: ResearchDocumentStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ResearchDocumentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type ResearchDocumentThread = {
  conversationId: string;
  messages: ResearchDocumentMessage[];
};

export type ResearchDocumentsPageData = {
  documents: ResearchDocument[];
};

export type ResearchActionResult<T = void> = ActionResult<T>;

export function isResearchDocumentMime(
  value: string
): value is ResearchDocumentMime {
  return (RESEARCH_DOCUMENT_ALLOWED_MIME as readonly string[]).includes(value);
}

export function researchDocumentAcceptAttr(): string {
  return [
    ".pdf",
    ".docx",
    ".txt",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ].join(",");
}
