'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { getPlanFromSubscriptionStatus } from '@/lib/stripe/plans';

interface SettingsFormProps {
  profile: {
    full_name: string | null;
    subscription_status: string;
    is_active: boolean;
  };
  email: string;
}

export default function SettingsForm({ profile, email }: SettingsFormProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [isActive, setIsActive] = useState(profile.is_active);
  const [isPausing, setIsPausing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const isPro = getPlanFromSubscriptionStatus(profile.subscription_status) !== 'free';

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
            <Button size="sm" onClick={() => { window.location.href = '/dashboard/upgrade'; }}>
              Upgrade to Pro →
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
