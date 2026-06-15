import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import Stripe from "stripe";

import { getStripePriceMap } from "@/lib/billing/constants";
import type { SubscriptionStatus, WiskPackage } from "@/lib/billing/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number;
};

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(key);
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "cancelled";
    default:
      return "cancelled";
  }
}

function resolvePackageFromSubscription(
  subscription: Stripe.Subscription,
  priceMap: Record<string, WiskPackage>
): WiskPackage | null {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return null;
  return priceMap[priceId] ?? null;
}

async function resolveUserId(
  subscription: Stripe.Subscription,
  customerId: string
): Promise<string | null> {
  const metadataUserId =
    subscription.metadata?.user_id ?? subscription.metadata?.userId;
  if (metadataUserId) return metadataUserId;

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .limit(1)
    .maybeSingle();

  return data?.user_id ?? null;
}

async function upsertSubscription(
  subscription: SubscriptionWithPeriod,
  statusOverride?: SubscriptionStatus
) {
  const priceMap = getStripePriceMap();
  const pkg = resolvePackageFromSubscription(subscription, priceMap);
  if (!pkg) {
    console.warn(
      "stripe webhook: unknown price for subscription",
      subscription.id
    );
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return;

  const userId = await resolveUserId(subscription, customerId);
  if (!userId) {
    console.warn(
      "stripe webhook: could not resolve user for subscription",
      subscription.id
    );
    return;
  }

  const status = statusOverride ?? mapStripeStatus(subscription.status);
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("user_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const row = {
    user_id: userId,
    package: pkg,
    status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    current_period_end: currentPeriodEnd,
    updated_at: now,
  };

  if (existing?.id) {
    const { error } = await admin
      .from("user_subscriptions")
      .update(row)
      .eq("id", existing.id);
    if (error) console.error("stripe webhook update failed:", error.message);
  } else {
    const { error } = await admin.from("user_subscriptions").insert(row);
    if (error) console.error("stripe webhook insert failed:", error.message);
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 400 }
    );
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 400 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as SubscriptionWithPeriod;
        await upsertSubscription(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as SubscriptionWithPeriod;
        await upsertSubscription(subscription, "cancelled");
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as InvoiceWithSubscription;
        const subscriptionId = invoice.subscription;
        if (typeof subscriptionId === "string") {
          const subscription = (await stripe.subscriptions.retrieve(
            subscriptionId
          )) as SubscriptionWithPeriod;
          await upsertSubscription(subscription);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as InvoiceWithSubscription;
        const subscriptionId = invoice.subscription;
        if (typeof subscriptionId === "string") {
          const subscription = (await stripe.subscriptions.retrieve(
            subscriptionId
          )) as SubscriptionWithPeriod;
          await upsertSubscription(subscription, "past_due");
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    Sentry.captureException(err);
    console.error("stripe webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
