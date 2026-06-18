import Stripe from "stripe";

let _client: Stripe | null = null;

/**
 * Returns a lazily-initialised Stripe server-side client.
 * Never call this in client components or edge runtimes.
 */
export function getStripeClient(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  _client = new Stripe(key);
  return _client;
}
