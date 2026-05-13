'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TIMEZONES } from '@/lib/timezones';

interface SettingsFormProps {
  profile: {
    full_name: string | null;
    timezone: string;
    send_time: string;
    subscription_status: string;
    is_active: boolean;
  };
  email: string;
}

export default function SettingsForm({ profile, email }: SettingsFormProps) {
  const router = useRouter();

  // Profile section
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Delivery section
  const [timezone, setTimezone] = useState(profile.timezone);
  const [sendTime, setSendTime] = useState(profile.send_time.slice(0, 5));
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);

  // Danger zone
  const [isActive, setIsActive] = useState(profile.is_active);
  const [isPausing, setIsPausing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const isPro = profile.subscription_status === 'active';

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() || null }),
      });
      if (!res.ok) { const { error } = await res.json(); throw new Error(typeof error === 'string' ? error : 'Save failed'); }
      toast.success('Profile saved.');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveDelivery(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingDelivery(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone, send_time: sendTime }),
      });
      if (!res.ok) { const { error } = await res.json(); throw new Error(typeof error === 'string' ? error : 'Save failed'); }
      toast.success('Delivery schedule saved.');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setIsSavingDelivery(false);
    }
  }

  async function handleTogglePause() {
    const newActive = !isActive;
    setIsPausing(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (!res.ok) { const { error } = await res.json(); throw new Error(typeof error === 'string' ? error : 'Failed'); }
      setIsActive(newActive);
      toast.success(newActive ? 'Your brief is now active.' : 'Your brief has been paused.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setIsPausing(false);
    }
  }

  async function handleManageSubscription() {
    setIsOpeningPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to open billing portal.');
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open billing portal.');
      setIsOpeningPortal(false);
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/user/settings', { method: 'DELETE' });
      if (!res.ok) { const { error } = await res.json(); throw new Error(typeof error === 'string' ? error : 'Delete failed'); }
      window.location.href = '/?deleted=true';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete account.');
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile */}
      <section className="rounded-xl border border-surface-border bg-white p-6 space-y-5">
        <h2 className="text-base font-semibold text-ink">Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="max-w-xs"
            />
          </div>
          <div className="space-y-2">
            <Label>Email address</Label>
            <p className="text-sm text-ink-muted">{email}</p>
          </div>
          <Button type="submit" disabled={isSavingProfile}>
            {isSavingProfile ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </section>

      {/* Delivery */}
      <section className="rounded-xl border border-surface-border bg-white p-6 space-y-5">
        <h2 className="text-base font-semibold text-ink">Delivery</h2>
        <form onSubmit={handleSaveDelivery} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="send-time">Send time</Label>
            <input
              id="send-time"
              type="time"
              value={sendTime}
              onChange={(e) => setSendTime(e.target.value)}
              className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            />
            <p className="text-xs text-ink-muted">
              Your brief will be sent at this time in your selected timezone.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone" className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isSavingDelivery}>
            {isSavingDelivery ? 'Saving…' : 'Save schedule'}
          </Button>
        </form>
      </section>

      {/* Subscription */}
      <section className="rounded-xl border border-surface-border bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-ink">Subscription</h2>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isPro
                ? 'bg-brand-purple text-white'
                : 'border border-surface-border bg-surface-secondary text-ink-muted'
            }`}
          >
            {isPro ? 'Brief Pro' : 'Free plan'}
          </span>
        </div>
        {isPro ? (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted">You have access to all 12 module credits.</p>
            <Button
              variant="outline"
              size="sm"
              disabled={isOpeningPortal}
              onClick={handleManageSubscription}
            >
              {isOpeningPortal ? 'Opening…' : 'Manage subscription →'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted">Upgrade to Brief Pro for 12 credits and all modules.</p>
            <Button size="sm" asChild>
              <Link href="/dashboard/upgrade">Upgrade to Pro →</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-red-200 bg-white p-6 space-y-5">
        <h2 className="text-base font-semibold text-red-600">Danger zone</h2>

        {/* Pause brief */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Pause my brief</p>
            <p className="text-xs text-ink-muted">
              Your brief is currently{' '}
              <span className={isActive ? 'text-green-600' : 'text-red-500'}>
                {isActive ? 'active' : 'paused'}
              </span>
              . {isActive ? 'Pause to stop receiving emails temporarily.' : 'Resume to start receiving emails again.'}
            </p>
          </div>
          <Button
            type="button"
            variant={isActive ? 'outline' : 'default'}
            size="sm"
            disabled={isPausing}
            onClick={handleTogglePause}
          >
            {isPausing ? '…' : isActive ? 'Pause' : 'Resume'}
          </Button>
        </div>

        <div className="h-px bg-red-100" />

        {/* Delete account */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Delete account</p>
            <p className="text-xs text-ink-muted">
              Permanently delete your account, all modules, and email history.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account, all modules, and your email history.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Yes, delete my account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
