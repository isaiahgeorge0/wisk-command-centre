import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { cachedSystemPrompt } from "@/lib/ai/anthropic";
import { ANTHROPIC_TIMEOUT_MS } from "@/lib/ai/constants";
import { logUsage } from "@/lib/ai/usage-logger";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasAIAccess } from "@/lib/billing/access";
import { extractPlainTextFromNoteContent } from "@/lib/notes/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createProposalTempId,
  type WinstonProposal,
  type WinstonProposalItem,
} from "@/lib/winston/proposal";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContentBlock = AnthropicTextBlock | { type: string };
type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

const paramsSchema = z.object({
  noteId: z.string().uuid(),
});

const modelItemSchema = z.object({
  tempId: z.string().min(1).optional(),
  entityType: z.enum(["project", "task"]),
  fields: z.record(z.string(), z.unknown()),
  reasoning: z.string().trim().min(1),
  selected: z.boolean().optional(),
});

const modelResponseSchema = z.object({
  summary: z.string().trim().min(1).optional(),
  foundActionableItems: z.boolean(),
  noActionableReason: z.string().trim().optional(),
  items: z.array(modelItemSchema).max(40).optional(),
});

const SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant.
Analyze one note and extract a proposal for projects/tasks only when justified.

Return ONLY valid JSON with this shape:
{
  "summary": "optional short sentence",
  "foundActionableItems": true|false,
  "noActionableReason": "required when foundActionableItems is false",
  "items": [
    {
      "tempId": "tmp-any-string",
      "entityType": "project" | "task",
      "fields": { ... },
      "reasoning": "specific signal from the note",
      "selected": true
    }
  ]
}

Rules:
- If the note is not actionable, set foundActionableItems=false, provide noActionableReason, and return empty items.
- Never invent generic filler items to satisfy output shape.
- Every item must include specific reasoning grounded in explicit note signals.
- Project items are for genuinely new initiatives only.
- Task items can either:
  1) belong to a new project proposal by setting fields.projectRef to that project's tempId
  2) belong to an existing active project by setting fields.projectId to a real project id from context
- Prefer existing projects when the note clearly references ongoing work.
- Required fields:
  - project: fields.project_name (string), fields.service_type (string), fields.status ("active" unless clearly otherwise)
  - task: fields.title (string), fields.priority ("high"|"medium"|"low")
- Optional task fields: due_date (YYYY-MM-DD if explicitly known), projectRef, projectId, raw_content.
- Do not set both projectRef and projectId on the same task.
- selected should default true.
- No markdown, no commentary, JSON only.`;

function cleanJson(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function buildPrompt(args: {
  noteTitle: string;
  notePlain: string;
  activeProjects: Array<{ id: string; project_name: string }>;
}): string {
  const activeProjectsText =
    args.activeProjects.length > 0
      ? args.activeProjects
          .map((project) => `- ${project.id} | ${project.project_name}`)
          .join("\n")
      : "No active projects.";

  return `Note title: ${args.noteTitle || "Untitled"}
Note plain text:
${args.notePlain || "(empty note)"}

Existing active projects (use these ids when relevant):
${activeProjectsText}`;
}

function normalizeItems(rawItems: z.infer<typeof modelItemSchema>[]): WinstonProposalItem[] {
  const projectIds = new Set<string>();
  const mapped = rawItems.map((item) => {
    const tempId = item.tempId?.trim() || createProposalTempId();
    if (item.entityType === "project") {
      projectIds.add(tempId);
    }
    return {
      tempId,
      entityType: item.entityType,
      fields: { ...item.fields },
      reasoning: item.reasoning.trim(),
      selected: item.selected ?? true,
    } satisfies WinstonProposalItem;
  });

  return mapped.map((item) => {
    if (item.entityType !== "task") return item;
    const projectRef =
      typeof item.fields.projectRef === "string" ? item.fields.projectRef.trim() : "";
    const projectId =
      typeof item.fields.projectId === "string"
        ? item.fields.projectId.trim()
        : typeof item.fields.project_id === "string"
          ? item.fields.project_id.trim()
          : "";
    if (projectRef && !projectIds.has(projectRef)) {
      return {
        ...item,
        fields: {
          ...item.fields,
          projectRef: "",
          projectId: projectId || "",
        },
      };
    }
    return item;
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid note id" }, { status: 400 });
    }
    const noteId = parsedParams.data.noteId;

    const supabase = await createClient();
    const { user } = await getAuthContext();
    const userId = user.id;

    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("ai_access")
      .eq("user_id", userId)
      .maybeSingle();

    const canAccessWinston = await hasAIAccess(
      userId,
      createAdminClient(),
      prefs?.ai_access ?? false
    );

    if (!canAccessWinston) {
      return NextResponse.json(
        { error: "Winston access not enabled" },
        { status: 403 }
      );
    }

    const [{ data: note, error: noteError }, { data: projects, error: projectsError }] =
      await Promise.all([
        supabase
          .from("notes")
          .select("id, title, content")
          .eq("id", noteId)
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("projects")
          .select("id, project_name")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);

    if (noteError || !note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    if (projectsError) {
      console.error("propose-projects project fetch:", projectsError);
      return NextResponse.json(
        { error: "Could not load existing projects" },
        { status: 500 }
      );
    }

    const notePlain = extractPlainTextFromNoteContent(note.content);
    if (!notePlain.trim()) {
      return NextResponse.json({
        found: false,
        message: "Nothing actionable found in this note yet.",
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    Sentry.setUser({ id: userId });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1400,
        system: cachedSystemPrompt(SYSTEM_PROMPT),
        messages: [
          {
            role: "user",
            content: buildPrompt({
              noteTitle: note.title ?? "Untitled",
              notePlain,
              activeProjects: (projects ?? []) as Array<{
                id: string;
                project_name: string;
              }>,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("propose-projects Claude API error:", err);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeData = (await response.json()) as AnthropicResponse;
    const replyBlock = claudeData.content.find(
      (block): block is AnthropicTextBlock => block.type === "text"
    );
    if (!replyBlock?.text?.trim()) {
      throw new Error("No text content in Claude response");
    }

    const parsed = modelResponseSchema.safeParse(
      JSON.parse(cleanJson(replyBlock.text))
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Winston returned an invalid proposal format" },
        { status: 502 }
      );
    }

    await logUsage(
      userId,
      "chat",
      claudeData.usage?.input_tokens ?? 0,
      claudeData.usage?.output_tokens ?? 0
    );

    if (!parsed.data.foundActionableItems || !(parsed.data.items?.length ?? 0)) {
      return NextResponse.json({
        found: false,
        message:
          parsed.data.noActionableReason?.trim() ||
          "Nothing actionable found in this note.",
      });
    }

    const proposal: WinstonProposal = {
      proposalId: createProposalTempId(),
      sourceType: "note",
      sourceId: noteId,
      items: normalizeItems(parsed.data.items ?? []),
    };

    return NextResponse.json({
      found: proposal.items.length > 0,
      message: parsed.data.summary?.trim() || null,
      proposal,
    });
  } catch (error) {
    console.error("propose-projects error:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
