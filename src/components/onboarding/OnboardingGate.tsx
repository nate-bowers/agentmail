'use client';

import { useState } from 'react';
import OnboardingModal from './OnboardingModal';

interface OnboardingGateProps {
  userId: string;
  variant: 'free' | 'pro';
  onModulesCreated: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function OnboardingGate({ userId, variant, onModulesCreated }: OnboardingGateProps) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <OnboardingModal
      variant={variant}
      onComplete={() => setOpen(false)}
      onModulesCreated={onModulesCreated}
    />
  );
}
