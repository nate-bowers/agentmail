export type PlanId = 'free' | 'pro';

export interface Plan {
  id: PlanId;
  label: string;
  priceMonthly: number;
  pointLimit: number;
  stripePriceEnvVar: string;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    label: 'Free',
    priceMonthly: 0,
    pointLimit: 3,
    stripePriceEnvVar: '',
    features: [
      '3 module credits',
      'Daily email brief',
      'All core modules',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Brief Pro',
    priceMonthly: 9,
    pointLimit: 12,
    stripePriceEnvVar: 'STRIPE_PRO_PRICE_ID',
    features: [
      '12 module credits',
      'All 22 modules',
      'Priority delivery',
      'Email theme customization',
      'Daily email brief',
    ],
  },
};

export function getPriceId(planId: PlanId): string {
  const plan = PLANS[planId];
  if (!plan.stripePriceEnvVar) return '';
  return process.env[plan.stripePriceEnvVar] ?? '';
}

export function getPlanFromSubscriptionStatus(status: string | null): PlanId {
  switch (status) {
    case 'pro': return 'pro';
    case 'active': return 'pro'; // legacy: pre-migration rows stored 'active'
    case 'unlimited': return 'pro'; // legacy: stale rows from half-scaffolded tier collapse to pro
    default: return 'free';
  }
}

export function getPointLimit(planId: PlanId): number {
  return PLANS[planId].pointLimit;
}
