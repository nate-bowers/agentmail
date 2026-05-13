'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function UpgradeButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start checkout');
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button size="lg" className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? 'Redirecting to Stripe…' : 'Upgrade to Brief Pro — $9/month'}
    </Button>
  );
}
