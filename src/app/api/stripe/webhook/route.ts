import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { siteUrl } from "@/lib/url";
import * as Sentry from "@sentry/nextjs";
import Stripe from "stripe";

import { getStripePriceMap } from "@/lib/billing/constants";
import {
  getPackageDisplayName,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionConfirmedEmail,
  sendSubscriptionRenewedEmail,
} from "@/lib/billing/emails";
import type { SubscriptionStatus, WiskPackage } from "@/lib/billing/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number;
};

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  billing_reason?: string | null;
};

// ─── Stripe client ────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(key);
}

// ─── Status mapping ───────────────────────────────────────────────────────────

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

// ─── Package resolution ───────────────────────────────────────────────────────

function resolvePackageFromSubscription(
  subscription: Stripe.Subscription,
  priceMap: Record<string, WiskPackage>
): WiskPackage | null {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return null;
  return priceMap[priceId] ?? null;
}

function revalidateSubscriptionPaths() {
  revalidatePath("/");
  revalidatePath("/", "layout");
  revalidatePath("/properties");
  revalidatePath("/upgrade/success");
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

// ─── DB upsert ────────────────────────────────────────────────────────────────

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
    if (error) {
      console.error("stripe webhook update failed:", error.message);
    } else {
      revalidateSubscriptionPaths();
    }
  } else {
    const { error } = await admin.from("user_subscriptions").insert(row);
    if (error) {
      console.error("stripe webhook insert failed:", error.message);
    } else {
      revalidateSubscriptionPaths();
    }
  }
}

// ─── Email helpers ────────────────────────────────────────────────────────────

/** Look up a user's email (from auth) and display name (from preferences). */
async function getUserInfo(
  userId: string
): Promise<{ email: string; displayName: string } | null> {
  try {
    const admin = createAdminClient();

    const { data: authData, error } =
      await admin.auth.admin.getUserById(userId);
    if (error || !authData.user?.email) return null;

    const { data: prefs } = await admin
      .from("user_preferences")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      email: authData.user.email,
      displayName:
        (prefs as { display_name: string | null } | null)?.display_name ??
        "there",
    };
  } catch {
    return null;
  }
}

/**
 * Derive the customer ID from the invoice.customer field, which may be a
 * string ID, an expanded Customer object, or null.
 */
function extractCustomerId(
  customer: Stripe.Invoice["customer"]
): string | null {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  if ("id" in customer) return customer.id;
  return null;
}

/**
 * Map a Stripe price ID to a human-readable monthly price string.
 * Returns an empty string for unknown price IDs.
 */
function getPriceDisplayString(priceId: string | undefined): string {
  if (!priceId) return "";
  if (priceId === process.env.STRIPE_PRICE_AI_MONTHLY) return "£9/month";
  if (priceId === process.env.STRIPE_PRICE_AI_PRO_MONTHLY) return "£19/month";
  if (priceId === process.env.STRIPE_PRICE_PROPERTIES_MONTHLY) return "£17/month";
  if (priceId === process.env.STRIPE_PRICE_PROPERTIES_PRO_MONTHLY) return "£32/month";
  return "";
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

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
      // ── New subscription created via Checkout ────────────────────────────── //
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as Stripe.Subscription | null)?.id ?? null;

        if (!subId) break;

        const userId =
          session.metadata?.userId ?? session.metadata?.user_id ?? null;
        if (!userId) break;

        const sub = (await stripe.subscriptions.retrieve(
          subId
        )) as SubscriptionWithPeriod;

        const priceId = sub.items.data[0]?.price?.id;
        const priceMap = getStripePriceMap();
        const pkg = priceId ? priceMap[priceId] : null;
        if (!pkg) break;

        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : new Date();

        try {
          const userInfo = await getUserInfo(userId);
          if (userInfo) {
            await sendSubscriptionConfirmedEmail({
              to: userInfo.email,
              displayName: userInfo.displayName,
              packageName: getPackageDisplayName(pkg),
              price: getPriceDisplayString(priceId),
              periodEnd,
            });
          }
        } catch (emailErr) {
          console.error(
            "stripe webhook: failed to send subscription confirmed email:",
            emailErr
          );
        }
        break;
      }

      // ── Ongoing subscription changes ─────────────────────────────────────── //
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as SubscriptionWithPeriod;
        await upsertSubscription(subscription);
        break;
      }

      // ── Subscription cancelled (by user or failed payment) ───────────────── //
      case "customer.subscription.deleted": {
        const subscription = event.data.object as SubscriptionWithPeriod;
        await upsertSubscription(subscription, "cancelled");

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? null;

        if (customerId) {
          try {
            const userId = await resolveUserId(subscription, customerId);
            if (userId) {
              const userInfo = await getUserInfo(userId);
              const priceMap = getStripePriceMap();
              const pkg = resolvePackageFromSubscription(subscription, priceMap);
              const accessUntil = subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : new Date();

              if (userInfo && pkg) {
                await sendSubscriptionCancelledEmail({
                  to: userInfo.email,
                  displayName: userInfo.displayName,
                  packageName: getPackageDisplayName(pkg),
                  accessUntil,
                });
              }
            }
          } catch (emailErr) {
            console.error(
              "stripe webhook: failed to send subscription cancelled email:",
              emailErr
            );
          }
        }
        break;
      }

      // ── Successful payment (initial or renewal) ───────────────────────────── //
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as InvoiceWithSubscription;
        const subscriptionId = invoice.subscription;

        if (typeof subscriptionId === "string") {
          const subscription = (await stripe.subscriptions.retrieve(
            subscriptionId
          )) as SubscriptionWithPeriod;
          await upsertSubscription(subscription);

          // Only send renewal email for subsequent billing cycles —
          // the confirmation email handles the initial signup.
          if (invoice.billing_reason !== "subscription_create") {
            const customerId = extractCustomerId(invoice.customer);

            if (customerId) {
              try {
                const userId = await resolveUserId(subscription, customerId);
                if (userId) {
                  const userInfo = await getUserInfo(userId);
                  const priceMap = getStripePriceMap();
                  const pkg = resolvePackageFromSubscription(
                    subscription,
                    priceMap
                  );
                  const priceId = subscription.items.data[0]?.price?.id;
                  const nextRenewalDate = subscription.current_period_end
                    ? new Date(subscription.current_period_end * 1000)
                    : new Date();

                  if (userInfo && pkg) {
                    await sendSubscriptionRenewedEmail({
                      to: userInfo.email,
                      displayName: userInfo.displayName,
                      packageName: getPackageDisplayName(pkg),
                      price: getPriceDisplayString(priceId),
                      nextRenewalDate,
                    });
                  }
                }
              } catch (emailErr) {
                console.error(
                  "stripe webhook: failed to send subscription renewed email:",
                  emailErr
                );
              }
            }
          }
        }
        break;
      }

      // ── Failed payment ────────────────────────────────────────────────────── //
      case "invoice.payment_failed": {
        const invoice = event.data.object as InvoiceWithSubscription;
        const subscriptionId = invoice.subscription;

        if (typeof subscriptionId === "string") {
          const subscription = (await stripe.subscriptions.retrieve(
            subscriptionId
          )) as SubscriptionWithPeriod;
          await upsertSubscription(subscription, "past_due");

          const customerId = extractCustomerId(invoice.customer);

          if (customerId) {
            try {
              const userId = await resolveUserId(subscription, customerId);
              if (userId) {
                const userInfo = await getUserInfo(userId);
                const priceMap = getStripePriceMap();
                const pkg = resolvePackageFromSubscription(
                  subscription,
                  priceMap
                );

                if (userInfo && pkg) {
                  // Generate a Stripe customer portal URL for the payment update CTA.
                  const billingPortalUrl = await (async () => {
                    try {
                      const portalSession =
                        await stripe.billingPortal.sessions.create({
                          customer: customerId,
                          return_url: siteUrl("/upgrade"),
                        });
                      return portalSession.url;
                    } catch (portalErr) {
                      console.error(
                        "stripe webhook: failed to create portal session for payment failed email:",
                        portalErr
                      );
                      return siteUrl("/upgrade");
                    }
                  })();

                  await sendPaymentFailedEmail({
                    to: userInfo.email,
                    displayName: userInfo.displayName,
                    packageName: getPackageDisplayName(pkg),
                    portalUrl: billingPortalUrl,
                  });
                }
              }
            } catch (emailErr) {
              console.error(
                "stripe webhook: failed to send payment failed email:",
                emailErr
              );
            }
          }
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
