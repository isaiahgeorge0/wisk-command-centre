import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { canGenerateValuation } from "@/app/(dashboard)/properties/actions";
import { UnauthorizedError } from "@/lib/auth/errors";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { logUsage } from "@/lib/ai/usage-logger";
import { hasPackageAccess } from "@/lib/billing/access";
import { generatePropertyValuation } from "@/lib/properties/valuation-generator";
import type { PropertyComparable, PropertyValuation } from "@/lib/properties/types";

const bodySchema = z.object({
  propertyId: z.string().uuid(),
});

export async function POST(request: Request) {
  let supabase;
  let userId: string;

  try {
    ({ supabase, userId } = await getScopedSupabase());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const hasAccess = await hasPackageAccess(userId, "properties", supabase);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Properties subscription required" },
      { status: 403 }
    );
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

  const { propertyId } = parsed.data;

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (propertyError || !property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const eligibility = await canGenerateValuation(propertyId);
  if (!eligibility.canGenerate) {
    return NextResponse.json(
      {
        error: "Valuation cooldown active",
        nextAvailableAt: eligibility.nextAvailableAt,
      },
      { status: 429 }
    );
  }

  const { data: comparables } = await supabase
    .from("property_comparables")
    .select("*")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  try {
    Sentry.setUser({ id: userId });

    const result = await generatePropertyValuation(
      property,
      (comparables ?? []) as PropertyComparable[]
    );

    const generatedAt = new Date();
    const nextAvailableAt = new Date(generatedAt);
    nextAvailableAt.setMonth(nextAvailableAt.getMonth() + 3);

    const { data: valuation, error: insertError } = await supabase
      .from("property_valuations")
      .insert({
        user_id: userId,
        property_id: propertyId,
        rental_min: result.rental_min,
        rental_max: result.rental_max,
        sale_min: result.sale_min,
        sale_max: result.sale_max,
        confidence: result.confidence,
        search_level: result.search_level,
        reasoning: result.reasoning,
        web_sources: result.web_sources.length > 0 ? result.web_sources : null,
        manual_comparables:
          comparables && comparables.length > 0 ? comparables : null,
        generated_at: generatedAt.toISOString(),
        next_available_at: nextAvailableAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[generate-valuation] insert failed:", insertError);
      return NextResponse.json(
        { error: "Could not save valuation" },
        { status: 500 }
      );
    }

    await logUsage(
      userId,
      "property_valuation",
      result.inputTokens,
      result.outputTokens
    );

    return NextResponse.json({
      valuation: valuation as PropertyValuation,
      lowEvidenceWarning: result.low_evidence_warning,
    });
  } catch (error) {
    console.error("[generate-valuation] error:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Could not generate valuation" },
      { status: 500 }
    );
  }
}
