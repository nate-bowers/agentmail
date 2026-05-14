import { getPlanFromSubscriptionStatus, PLANS } from '@/lib/stripe/plans';

export function usePlan(subscriptionStatus: string | null) {
  const planId = getPlanFromSubscriptionStatus(subscriptionStatus);
  const plan = PLANS[planId];
  const isPro = planId === 'pro' || planId === 'unlimited';
  const isUnlimited = planId === 'unlimited';
  const isFree = planId === 'free';

  return {
    planId,
    plan,
    isPro,
    isUnlimited,
    isFree,
    pointLimit: plan.pointLimit,
    label: plan.label,
  };
}
