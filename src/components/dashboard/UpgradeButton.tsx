'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface UpgradeButtonProps {
  planId?: 'pro';
  label?: string;
}

export default function UpgradeButton({ planId = 'pro', label }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (!data.url) throw new Error('No checkout URL received from Stripe');
      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      console.error('[UpgradeButton] Checkout error:', err);
      toast.error('Could not open checkout', { description: message });
      setLoading(false);
    }
  }

  return (
    <Button size="lg" className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? 'Opening Stripe checkout…' : (label ?? 'Upgrade to Brief Pro — $9/month')}
    </Button>
  );
}
