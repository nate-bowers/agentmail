// Server-only — never import this in Client Components.
// Use NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY + @stripe/stripe-js on the client side.

import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
