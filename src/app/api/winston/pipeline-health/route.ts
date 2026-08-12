import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { ANTHROPIC_TIMEOUT_MS } from "@/lib/ai/constants";
import { cachedSystemPrompt } from "@/lib/ai/anthropic";
import { logUsage } from "@/lib/ai/usage-logger";
import { hasAIAccess } from "@/lib/billing/access";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import {
  buildFallbackPipelineResult,
  buildHealthyPipelineResult,
  buildPipelineHealthMetrics,
} from "@/lib/leads/pipeline-health";
import type { PipelineHealthFocus, PipelineHealthResult } from "@/lib/leads/types";
import { createAdminClient } from "@/lib/supabase/admin";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContentBlock = AnthropicTextBlock | { type: string };
type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

const bodySchema = z.object({}).optional();

const PIPELINE_HEALTH_SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant. Interpret these pre-computed pipeline health metrics. Do not invent data. Every flagged lead must include a specific reason, not a vague warning.

Return ONLY valid JSON with this shape:
{
  "summary": "1-3 sentences, plain language, the single most important thing to know right now",
  "focuses": [
    {
      "leadId": "uuid",
      "leadName": "string",
      "issue": "specific reason this lead needs attention",
      "suggestedAction": "specific next step",
      "urgency": "high|medium|low"
    }
  ]
}

Rules:
- focuses: 0-5 items max, most important first
- Never say a lead needs attention without saying why
- Refer to leads by name ("this lead", "Acme Ltd") — never restate currency amounts, values, £ figures, or "k" shorthand in issue, suggestedAction, or summary
- Do not invent, round, abbreviate, convert, or recalculate any figure. Exact amounts are attached by the application from source data and shown in the UI
- Do not mention "value at risk" totals or pipeline £ totals in the summary — those are rendered separately from source data
- Do not repeat dashboard stat labels unless they materially change the recommendation
- If the pipeline is broadly healthy, keep the summary calm and return an empty focuses array
- Keep the tone direct, premium, and practical`;

const responseSchema = z.object({
  summary: z.string().min(1),
  focuses: z
    .array(
      z.object({
        leadId: z.string().uuid(),
        leadName: z.string().min(1),
        issue: z.string().min(1),
        suggestedAction: z.string().min(1),
        urgency: z.enum(["high", "medium", "low"]),
      })
    )
    .max(5),
});

function shouldReturnHealthyState(metrics: Awaited<ReturnType<typeof buildPipelineHealthMetrics>>) {
  const noFlaggedLeads = metrics.stalledLeads.length === 0;
  const conversionNotDown = metrics.trends.conversionRate.delta >= 0;
  const pipelineNotDown = metrics.trends.pipelineValue.delta >= 0;
  return noFlaggedLeads && conversionNotDown && pipelineNotDown;
}

function buildUserPrompt(
  metrics: Awaited<ReturnType<typeof buildPipelineHealthMetrics>>
): string {
  const stageRates =
    metrics.stageConversionRates.length > 0
      ? metrics.stageConversionRates
          .map(
            (rate) =>
              `${rate.fromStage} -> ${rate.toStage}: ${rate.ratePercent}% (${rate.progressedCount}/${rate.totalTransitions})`
          )
          .join("\n")
      : "No stage conversion data yet.";

  const stalledLeads =
    metrics.stalledLeads.length > 0
      ? metrics.stalledLeads
          .slice(0, 8)
          .map(
            (lead) =>
              `- ${lead.leadId} | ${lead.leadName} | stage=${lead.currentStage} | daysSinceLastActivity=${lead.daysSinceLastActivity} | daysInCurrentStage=${lead.daysInCurrentStage} | reasons=${lead.reasons.join(" ")}`
          )
          .join("\n")
      : "No stalled or overdue leads.";

  return `Metrics:
- stalled threshold: ${metrics.stalledDaysThreshold} days
- stalled leads count: ${metrics.stalledLeads.length}
- VALUE_AT_RISK_LABEL (context only — do not copy into JSON output): ${metrics.valueAtRiskLabel}
- average days in stage: ${metrics.averageDaysInStage ?? "n/a"}

Trends (pipeline value is annualized for comparison: monthly × 12 + upfront; do not restate these £ figures in output):
- conversion rate current=${metrics.trends.conversionRate.current}, previous=${metrics.trends.conversionRate.previous}, delta=${metrics.trends.conversionRate.delta}
- annualized pipeline value trend direction: delta=${metrics.trends.pipelineValue.delta} (positive = up)

Stage conversion rates:
${stageRates}

Flagged leads (no currency figures — amounts are attached in code):
${stalledLeads}`;
}

function attachSourceValues(
  focuses: Array<{
    leadId: string;
    leadName: string;
    issue: string;
    suggestedAction: string;
    urgency: "high" | "medium" | "low";
  }>,
  metrics: Awaited<ReturnType<typeof buildPipelineHealthMetrics>>
): PipelineHealthFocus[] {
  const byId = new Map(metrics.stalledLeads.map((lead) => [lead.leadId, lead]));
  return focuses.map((focus) => {
    const source = byId.get(focus.leadId);
    return {
      leadId: focus.leadId,
      leadName: source?.leadName ?? focus.leadName,
      value: source?.value ?? null,
      valueType: source?.valueType ?? "one_time",
      issue: focus.issue,
      suggestedAction: focus.suggestedAction,
      urgency: focus.urgency,
    };
  });
}

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await getScopedSupabase();

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

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsedBody = bodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const metrics = await buildPipelineHealthMetrics(userId);

    if (shouldReturnHealthyState(metrics)) {
      const result = buildHealthyPipelineResult(metrics.generatedAt);
      await logUsage(userId, "pipeline_health", 0, 0);
      return NextResponse.json(result satisfies PipelineHealthResult);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    Sentry.setUser({ id: userId });

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        system: cachedSystemPrompt(PIPELINE_HEALTH_SYSTEM_PROMPT),
        messages: [{ role: "user", content: buildUserPrompt(metrics) }],
      }),
      signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error("pipeline-health Claude API error:", err);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = (await claudeResponse.json()) as AnthropicResponse;
    const replyBlock = claudeData.content.find(
      (block): block is AnthropicTextBlock => block.type === "text"
    );

    if (!replyBlock?.text?.trim()) {
      throw new Error("No text content in Claude response");
    }

    const cleaned = replyBlock.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = responseSchema.safeParse(JSON.parse(cleaned));

    const fallback = buildFallbackPipelineResult(metrics);
    const allowedLeadIds = new Set(metrics.stalledLeads.map((lead) => lead.leadId));

    const focuses: PipelineHealthFocus[] = parsed.success
      ? attachSourceValues(
          parsed.data.focuses
            .filter((focus) => allowedLeadIds.has(focus.leadId))
            .slice(0, 5),
          metrics
        )
      : fallback.focuses;

    const summary = parsed.success
      ? parsed.data.summary.trim()
      : fallback.summary.replace(/\s*Value at risk:.*$/i, "").trim();

    const result: PipelineHealthResult = {
      summary: summary || fallback.summary,
      focuses,
      valueAtRisk: metrics.valueAtRisk,
      generatedAt: metrics.generatedAt,
    };

    await logUsage(
      userId,
      "pipeline_health",
      claudeData.usage?.input_tokens ?? 0,
      claudeData.usage?.output_tokens ?? 0
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("pipeline-health error:", error);
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
