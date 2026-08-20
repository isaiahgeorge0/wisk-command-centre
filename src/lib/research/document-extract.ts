import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

import {
  isResearchDocumentMime,
  type ResearchDocumentMime,
} from "@/lib/research/documents-types";

/** Cap stored extract so prompts stay within a sane token budget. */
export const RESEARCH_DOCUMENT_EXTRACT_MAX_CHARS = 100_000;

export async function extractResearchDocumentText(input: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<string> {
  const mime = resolveMime(input.mimeType, input.fileName);
  if (!mime) {
    throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
  }

  let text = "";
  if (mime === "application/pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(input.buffer));
    const result = await extractText(pdf, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join("\n") : String(result.text ?? "");
  } else if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: input.buffer });
    text = result.value ?? "";
  } else {
    text = input.buffer.toString("utf8");
  }

  const cleaned = text.replace(/\u0000/g, "").replace(/\s+\n/g, "\n").trim();
  if (!cleaned) {
    throw new Error("Could not extract any text from this file.");
  }

  if (cleaned.length <= RESEARCH_DOCUMENT_EXTRACT_MAX_CHARS) return cleaned;
  return `${cleaned.slice(0, RESEARCH_DOCUMENT_EXTRACT_MAX_CHARS)}…`;
}

function resolveMime(
  mimeType: string,
  fileName: string
): ResearchDocumentMime | null {
  if (isResearchDocumentMime(mimeType)) return mimeType;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".txt")) return "text/plain";
  return null;
}
