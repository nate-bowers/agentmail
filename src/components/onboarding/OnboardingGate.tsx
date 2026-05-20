'use client';

import OnboardingModal from './OnboardingModal';

interface OnboardingGateProps {
  variant: 'free' | 'pro';
  onModulesCreated: () => Promise<void>;
  onClose: () => void;
  initialStep?: number;
  currentModulesCount: number;
}

export default function OnboardingGate({
  variant,
  onModulesCreated,
  onClose,
  initialStep,
  currentModulesCount,
}: OnboardingGateProps) {
  return (
    <OnboardingModal
      variant={variant}
      onComplete={onClose}
      onModulesCreated={onModulesCreated}
      initialStep={initialStep}
      currentModulesCount={currentModulesCount}
    />
  );
}
