import { getPlanFromSubscriptionStatus, PLANS } from '@/lib/stripe/plans';

export function usePlan(subscriptionStatus: string | null) {
  const planId = getPlanFromSubscriptionStatus(subscriptionStatus);
  const plan = PLANS[planId];
  const isPro = planId === 'pro';
  const isFree = planId === 'free';

  return {
    planId,
    plan,
    isPro,
    isFree,
    pointLimit: plan.pointLimit,
    label: plan.label,
  };
}
