// Server-only — never import this in Client Components.
// Use NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY + @stripe/stripe-js on the client side.

import Stripe from 'stripe';

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

// Proxy so existing `stripe.X` call sites keep working without changes.
export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
