import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { getAuthContext } from "@/lib/auth/get-auth-context";
import { getStripeClient } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  let userId: string;

  try {
    const { user } = await getAuthContext();
    userId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json(
        { error: "Site URL not configured" },
        { status: 500 }
      );
    }

    // ── Look up stripe_customer_id ──────────────────────────────────────────────
    const admin = createAdminClient();
    const { data: subscription } = await admin
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    const stripeCustomerId = subscription?.stripe_customer_id;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 400 }
      );
    }

    // ── Create billing portal session ───────────────────────────────────────────
    const stripe = getStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${siteUrl}/upgrade`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    Sentry.captureException(err);
    console.error("customer-portal error:", err);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
