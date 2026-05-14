'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function UpgradeButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start checkout');
      if (!data.url) throw new Error('No checkout URL returned');
      window.location.href = data.url;
    } catch (err) {
      console.error('[UpgradeButton] Checkout error:', err);
      setLoading(false);
    }
  }

  return (
    <Button size="lg" className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? 'Opening Stripe checkout…' : 'Upgrade to Brief Pro — $9/month'}
    </Button>
  );
}
