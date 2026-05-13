import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Check, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import UpgradeButton from '@/components/dashboard/UpgradeButton';
import { PLANS } from '@/lib/stripe/products';

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  const isActive = profile?.subscription_status === 'active';

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        </Button>
        <h1 className="mt-3 text-xl font-semibold">
          {isActive ? 'Your subscription' : 'Upgrade to Brief Pro'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isActive
            ? 'You have an active Pro subscription.'
            : 'Unlock unlimited modules and priority delivery.'}
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Free */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{PLANS.free.name}</p>
            <p className="text-3xl font-semibold mt-1">$0</p>
            <p className="text-xs text-muted-foreground">per month</p>
          </div>
          <ul className="space-y-2">
            {PLANS.free.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <Badge variant="secondary" className="text-xs">Current plan</Badge>
          </div>
        </div>

        {/* Pro */}
        <div className="rounded-lg border-2 border-primary bg-card p-6 space-y-4 relative">
          <Badge className="absolute right-4 top-4 text-xs">Popular</Badge>
          <div>
            <p className="text-sm font-medium">{PLANS.pro.name}</p>
            <p className="text-3xl font-semibold mt-1">${PLANS.pro.monthlyPrice}</p>
            <p className="text-xs text-muted-foreground">per month</p>
          </div>
          <ul className="space-y-2">
            {PLANS.pro.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>
          <div className="pt-2">
            {isActive ? (
              <Badge className="text-xs">Active</Badge>
            ) : (
              <UpgradeButton />
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Payments are processed securely by Stripe. Cancel anytime.
      </p>
    </div>
  );
}
