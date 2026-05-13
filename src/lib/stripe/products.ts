export const PLANS = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    moduleLimit: 3,
    features: [
      'Up to 3 modules',
      'Daily email brief',
    ],
  },
  pro: {
    name: 'Brief Pro',
    monthlyPrice: 9,
    // Set STRIPE_PRO_PRICE_ID to the price ID from your Stripe dashboard.
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    moduleLimit: null, // unlimited
    features: [
      'Unlimited modules',
      'Priority delivery',
      'Daily email brief',
    ],
  },
} as const;
