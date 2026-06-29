import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { getAuthContext } from "@/lib/auth/get-auth-context";
import { getStripeClient } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  priceId: z.string().min(1),
});

export async function POST(request: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  let userId: string;
  let email: string | undefined;

  try {
    const { user } = await getAuthContext();
    userId = user.id;
    email = user.email ?? undefined;
  } catch {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const aiPriceId = process.env.STRIPE_PRICE_AI_MONTHLY;
    const aiProPriceId = process.env.STRIPE_PRICE_AI_PRO_MONTHLY;
    const propertiesPriceId = process.env.STRIPE_PRICE_PROPERTIES_MONTHLY;
    const propertiesProPriceId = process.env.STRIPE_PRICE_PROPERTIES_PRO_MONTHLY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!aiPriceId || !aiProPriceId || !siteUrl) {
      return NextResponse.json(
        { error: "Stripe not fully configured" },
        { status: 500 }
      );
    }

    // ── Parse body ──────────────────────────────────────────────────────────────
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

    const { priceId } = parsed.data;

    if (priceId === propertiesPriceId && !propertiesPriceId) {
      return NextResponse.json(
        { error: "Properties billing not configured" },
        { status: 500 }
      );
    }

    if (priceId === propertiesProPriceId && !propertiesProPriceId) {
      return NextResponse.json(
        { error: "Properties Pro billing not configured" },
        { status: 500 }
      );
    }

    if (
      priceId !== aiPriceId &&
      priceId !== aiProPriceId &&
      priceId !== propertiesPriceId &&
      priceId !== propertiesProPriceId
    ) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // ── Duplicate-subscription guard ────────────────────────────────────────────
    const admin = createAdminClient();

    if (priceId === propertiesProPriceId) {
      const { data: existingPropertiesPro } = await admin
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("package", "properties_pro")
        .in("status", ["active", "trialing"])
        .limit(1)
        .maybeSingle();

      if (existingPropertiesPro) {
        return NextResponse.json(
          { error: "Already subscribed" },
          { status: 409 }
        );
      }
    } else if (priceId === propertiesPriceId) {
      const { data: existingProperties } = await admin
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("package", "properties")
        .in("status", ["active", "trialing"])
        .limit(1)
        .maybeSingle();

      if (existingProperties) {
        return NextResponse.json(
          { error: "Already subscribed to Properties" },
          { status: 400 }
        );
      }
    } else {
      const { data: existing } = await admin
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .limit(1)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "Already subscribed" },
          { status: 400 }
        );
      }
    }

    // ── Create Stripe checkout session ──────────────────────────────────────────
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      ...(email ? { customer_email: email } : {}),
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/upgrade?cancelled=true`,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    Sentry.captureException(err);
    console.error("create-checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
