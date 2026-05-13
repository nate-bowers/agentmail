'use client';

import { useState } from 'react';
import OnboardingModal from './OnboardingModal';

export default function OnboardingGate({ userId }: { userId: string }) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return <OnboardingModal userId={userId} onComplete={() => setOpen(false)} />;
}
