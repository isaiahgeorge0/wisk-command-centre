"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasResearchAccess } from "@/lib/billing/access";
import { toSafeActionError } from "@/lib/errors/to-safe-action-error";
import { summariseResearchDocument } from "@/lib/research/document-analysis";
import { extractResearchDocumentText } from "@/lib/research/document-extract";
import { answerResearchDocumentQuestion } from "@/lib/research/document-qa";
import {
  RESEARCH_DOCUMENT_MAX_BYTES,
  isResearchDocumentMime,
  type ResearchDocument,
  type ResearchDocumentMessage,
  type ResearchDocumentThread,
  type ResearchDocumentsPageData,
} from "@/lib/research/documents-types";
import type { ActionResult } from "@/lib/leads/types";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getScopeKeyTitle,
  researchDocumentScopeKey,
} from "@/lib/winston/scope";

const STORAGE_BUCKET = "research-documents";

const askSchema = z.object({
  documentId: z.string().uuid(),
  question: z.string().trim().min(1, "Enter a question").max(2000),
  conversationId: z.string().uuid().optional(),
});

const documentIdSchema = z.object({
  documentId: z.string().uuid(),
});

function revalidateDocumentPaths() {
  revalidatePath("/research");
  revalidatePath("/research/documents");
}

async function assertResearchAccess(userId: string) {
  const admin = createAdminClient();
  const allowed = await hasResearchAccess(userId, admin);
  if (!allowed) {
    throw new Error("Research is not enabled for this account.");
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function getResearchDocumentsPageData(): Promise<ResearchDocumentsPageData | null> {
  try {
    const { supabase, userId } = await getScopedSupabase();
    await assertResearchAccess(userId);

    const { data, error } = await supabase
      .from("research_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getResearchDocumentsPageData:", error);
      return { documents: [] };
    }

    return { documents: (data ?? []) as ResearchDocument[] };
  } catch (error) {
    console.error("getResearchDocumentsPageData:", error);
    return null;
  }
}

export async function uploadResearchDocument(
  formData: FormData
): Promise<ActionResult<ResearchDocument>> {
  try {
    const { supabase, userId } = await getScopedSupabase();
    await assertResearchAccess(userId);

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "Choose a file to upload." };
    }

    const displayName =
      String(formData.get("name") ?? "").trim() ||
      file.name.replace(/\.[^.]+$/, "") ||
      "Untitled document";

    if (!isResearchDocumentMime(file.type) && !looksLikeAllowedExtension(file.name)) {
      return {
        success: false,
        error: "Invalid file type. Allowed: PDF, DOCX, TXT.",
      };
    }
    if (file.size > RESEARCH_DOCUMENT_MAX_BYTES) {
      return { success: false, error: "File exceeds 10MB limit." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText: string;
    try {
      extractedText = await extractResearchDocumentText({
        buffer,
        mimeType: file.type,
        fileName: file.name,
      });
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not extract text from this file.",
      };
    }

    const documentId = crypto.randomUUID();
    const sanitized = sanitizeFileName(file.name);
    const filePath = `${userId}/${documentId}/${Date.now()}_${sanitized}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: toSafeActionError(uploadError, "Could not upload this document."),
      };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("research_documents")
      .insert({
        id: documentId,
        user_id: userId,
        name: displayName,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type || guessMimeFromName(file.name),
        extracted_text: extractedText,
        summary: null,
        status: "processing",
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      return {
        success: false,
        error: toSafeActionError(
          insertError,
          "Could not save this document."
        ),
      };
    }

    try {
      const { summary } = await summariseResearchDocument({
        userId,
        documentName: displayName,
        extractedText,
      });

      const { data: updated, error: updateError } = await supabase
        .from("research_documents")
        .update({
          summary,
          status: "ready",
          error_message: null,
        })
        .eq("id", documentId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (updateError || !updated) {
        throw updateError ?? new Error("Could not save summary.");
      }

      revalidateDocumentPaths();
      return { success: true, data: updated as ResearchDocument };
    } catch (error) {
      console.error("uploadResearchDocument summarise:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Could not summarise this document.";

      const { error: failUpdateError } = await supabase
        .from("research_documents")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", documentId)
        .eq("user_id", userId);

      if (failUpdateError) {
        console.error("uploadResearchDocument fail stamp:", failUpdateError);
      }

      revalidateDocumentPaths();
      return { success: false, error: message };
    }
  } catch (error) {
    console.error("uploadResearchDocument:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not upload this document.",
    };
  }
}

export async function getResearchDocumentUrl(
  filePath: string
): Promise<string | null> {
  const { supabase, userId } = await getScopedSupabase();
  await assertResearchAccess(userId);
  if (!filePath.startsWith(`${userId}/`)) return null;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 3600);
  if (error) {
    console.error("getResearchDocumentUrl:", error);
    return null;
  }
  return data.signedUrl;
}

export async function deleteResearchDocument(
  documentId: string
): Promise<ActionResult> {
  try {
    const parsed = documentIdSchema.safeParse({ documentId });
    if (!parsed.success) {
      return { success: false, error: "Invalid document." };
    }

    const { supabase, userId } = await getScopedSupabase();
    await assertResearchAccess(userId);

    const { data: existing } = await supabase
      .from("research_documents")
      .select("id, file_path")
      .eq("id", parsed.data.documentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      return { success: false, error: "Document not found." };
    }

    await supabase.storage.from(STORAGE_BUCKET).remove([existing.file_path]);

    const { error } = await supabase
      .from("research_documents")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (error) {
      return {
        success: false,
        error: toSafeActionError(error, "Could not delete this document."),
      };
    }

    revalidateDocumentPaths();
    return { success: true };
  } catch (error) {
    console.error("deleteResearchDocument:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not delete this document.",
    };
  }
}

export async function getResearchDocumentThread(
  documentId: string
): Promise<ActionResult<ResearchDocumentThread>> {
  try {
    const parsed = documentIdSchema.safeParse({ documentId });
    if (!parsed.success) {
      return { success: false, error: "Invalid document." };
    }

    const { supabase, userId } = await getScopedSupabase();
    await assertResearchAccess(userId);

    const { data: doc } = await supabase
      .from("research_documents")
      .select("id")
      .eq("id", parsed.data.documentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!doc) {
      return { success: false, error: "Document not found." };
    }

    const scopeKey = researchDocumentScopeKey(parsed.data.documentId);
    const { data: conversation } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("scope_key", scopeKey)
      .maybeSingle();

    if (!conversation) {
      return {
        success: true,
        data: { conversationId: "", messages: [] },
      };
    }

    const { data: messages, error } = await supabase
      .from("ai_conversation_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversation.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      return {
        success: false,
        error: toSafeActionError(error, "Could not load this thread."),
      };
    }

    return {
      success: true,
      data: {
        conversationId: conversation.id,
        messages: (messages ?? []) as ResearchDocumentMessage[],
      },
    };
  } catch (error) {
    console.error("getResearchDocumentThread:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not load this thread.",
    };
  }
}

export async function askResearchDocumentQuestionAction(
  input: z.infer<typeof askSchema>
): Promise<
  ActionResult<{
    conversationId: string;
    answer: string;
    userMessage: ResearchDocumentMessage;
    assistantMessage: ResearchDocumentMessage;
  }>
> {
  try {
    const parsed = askSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const { supabase, userId } = await getScopedSupabase();
    await assertResearchAccess(userId);

    const { data: doc, error: docError } = await supabase
      .from("research_documents")
      .select("*")
      .eq("id", parsed.data.documentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (docError || !doc) {
      return { success: false, error: "Document not found." };
    }

    const document = doc as ResearchDocument;
    if (document.status !== "ready" || !document.extracted_text?.trim()) {
      return {
        success: false,
        error: "This document is not ready for questions yet.",
      };
    }

    const scopeKey = researchDocumentScopeKey(document.id);
    let conversationId = parsed.data.conversationId ?? null;

    if (conversationId) {
      const { data: owned } = await supabase
        .from("ai_conversations")
        .select("id, scope_key")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!owned || owned.scope_key !== scopeKey) {
        return {
          success: false,
          error: "Conversation does not match this document.",
        };
      }
    } else {
      const { data: existing } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("user_id", userId)
        .eq("scope_key", scopeKey)
        .maybeSingle();

      if (existing) {
        conversationId = existing.id;
      } else {
        const { data: created, error: createError } = await supabase
          .from("ai_conversations")
          .insert({
            user_id: userId,
            title: getScopeKeyTitle(scopeKey),
            scope_key: scopeKey,
          })
          .select("id")
          .single();

        if (createError || !created) {
          return {
            success: false,
            error: toSafeActionError(
              createError,
              "Could not start this document thread."
            ),
          };
        }
        conversationId = created.id;
      }
    }

    if (!conversationId) {
      return { success: false, error: "Could not start this document thread." };
    }

    const activeConversationId = conversationId;

    const { data: history } = await supabase
      .from("ai_conversation_messages")
      .select("role, content")
      .eq("conversation_id", activeConversationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const { data: userRow, error: userInsertError } = await supabase
      .from("ai_conversation_messages")
      .insert({
        user_id: userId,
        conversation_id: activeConversationId,
        role: "user",
        content: parsed.data.question,
      })
      .select("id, role, content, created_at")
      .single();

    if (userInsertError || !userRow) {
      return {
        success: false,
        error: toSafeActionError(
          userInsertError,
          "Could not save your question."
        ),
      };
    }

    const { answer } = await answerResearchDocumentQuestion({
      userId,
      documentName: document.name,
      extractedText: document.extracted_text,
      question: parsed.data.question,
      history: (history ?? []).map((row) => ({
        role: row.role as "user" | "assistant",
        content: row.content as string,
      })),
    });

    const { data: assistantRow, error: assistantInsertError } = await supabase
      .from("ai_conversation_messages")
      .insert({
        user_id: userId,
        conversation_id: activeConversationId,
        role: "assistant",
        content: answer,
      })
      .select("id, role, content, created_at")
      .single();

    if (assistantInsertError || !assistantRow) {
      return {
        success: false,
        error: toSafeActionError(
          assistantInsertError,
          "Could not save Winston's reply."
        ),
      };
    }

    return {
      success: true,
      data: {
        conversationId: activeConversationId,
        answer,
        userMessage: userRow as ResearchDocumentMessage,
        assistantMessage: assistantRow as ResearchDocumentMessage,
      },
    };
  } catch (error) {
    console.error("askResearchDocumentQuestionAction:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not answer this question.",
    };
  }
}

function looksLikeAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".txt")
  );
}

function guessMimeFromName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "text/plain";
}
