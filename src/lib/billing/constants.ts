import type { WiskPackage } from "@/lib/billing/types";

/** Map Stripe price IDs to WISK packages. Replace placeholders when Stripe is live. */
export function getStripePriceMap(): Record<string, WiskPackage> {
  const map: Record<string, WiskPackage> = {
    price_ai_monthly_placeholder: "ai",
    price_ai_pro_monthly_placeholder: "ai_pro",
  };

  if (process.env.STRIPE_PRICE_AI_MONTHLY) {
    map[process.env.STRIPE_PRICE_AI_MONTHLY] = "ai";
  }

  if (process.env.STRIPE_PRICE_AI_PRO_MONTHLY) {
    map[process.env.STRIPE_PRICE_AI_PRO_MONTHLY] = "ai_pro";
  }

  return map;
}

export const STRIPE_PRICE_MAP = getStripePriceMap();
