import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { logUsage } from "@/lib/ai/usage-logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TRIAGE_SYSTEM_PROMPT = `You are Winston, a helpful property assistant. A tenant has reported a maintenance issue. Provide 2-3 simple troubleshooting steps they can try before a contractor is called. Be clear, friendly, and practical. Keep each step under 2 sentences. If the issue sounds like an emergency (gas leak, flooding, no heat in winter, electrical sparks), immediately tell them to contact emergency services and their landlord.

Return ONLY a raw JSON object with no markdown, no code fences, no explanation. The response must start with { and end with }.

Use this shape:
{"steps":["step 1","step 2"],"isEmergency":false}`;

const FALLBACK_STEPS = [
  "Check if there is a simple cause you can fix safely, such as a tripped switch or closed valve.",
  "Try turning the affected appliance or system off and on again if it is safe to do so.",
  "If the problem continues, report it to your landlord so they can arrange a repair.",
];

const bodySchema = z.object({
  issue: z.string().trim().min(1).max(2000),
  category: z.string().trim().min(1),
});

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicResponse = {
  content: AnthropicTextBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

function parseTriageResponse(text: string): {
  steps: string[];
  isEmergency: boolean;
} {
  const cleaned = text
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const json = JSON.parse(cleaned) as {
      steps?: string[];
      isEmergency?: boolean;
    };
    const steps = (json.steps ?? []).filter(
      (step) => typeof step === "string" && step.trim()
    );

    if (steps.length > 0) {
      return { steps, isEmergency: json.isEmergency === true };
    }
  } catch {
    // Fall through to generic steps.
  }

  return { steps: FALLBACK_STEPS, isEmergency: false };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, user_id")
    .eq("portal_user_id", user.id)
    .eq("portal_enabled", true)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 503 }
    );
  }

  try {
    Sentry.setUser({ id: user.id });

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: TRIAGE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Category: ${parsed.data.category}\n\nIssue: ${parsed.data.issue}`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error("[portal/winston-triage] Claude error:", err);
      return NextResponse.json(
        { error: "Could not generate troubleshooting steps" },
        { status: 500 }
      );
    }

    const claudeData = (await claudeResponse.json()) as AnthropicResponse;
    const textBlock = claudeData.content.find((b) => b.type === "text");

    if (!textBlock?.text) {
      return NextResponse.json(
        { error: "Empty response from Winston" },
        { status: 500 }
      );
    }

    const { steps, isEmergency } = parseTriageResponse(textBlock.text);

    await logUsage(
      tenant.user_id as string,
      "portal_triage",
      claudeData.usage?.input_tokens ?? 0,
      claudeData.usage?.output_tokens ?? 0
    );

    return NextResponse.json({ steps, isEmergency });
  } catch (error) {
    console.error("[portal/winston-triage] error:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
