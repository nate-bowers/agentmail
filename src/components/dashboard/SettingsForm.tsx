'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import type { Profile } from '@/types';

interface SettingsFormProps {
  profile: Pick<Profile, 'full_name' | 'timezone' | 'send_time'>;
}

export default function SettingsForm({ profile }: SettingsFormProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [timezone, setTimezone] = useState(profile.timezone);
  // DB stores "HH:MM:SS"; time input expects "HH:MM"
  const [sendTime, setSendTime] = useState(profile.send_time.slice(0, 5));

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          timezone,
          send_time: sendTime,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(typeof error === 'string' ? error : 'Save failed');
      }

      toast.success('Settings saved.');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);

    try {
      const res = await fetch('/api/user/settings', { method: 'DELETE' });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(typeof error === 'string' ? error : 'Delete failed');
      }
      router.push('/login');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete account.');
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Profile + schedule form */}
      <form onSubmit={handleSave} className="space-y-5">
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
          <Label htmlFor="send-time">Send time</Label>
          <input
            id="send-time"
            type="time"
            value={sendTime}
            onChange={(e) => setSendTime(e.target.value)}
            className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            required
          />
          <p className="text-xs text-muted-foreground">
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

        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      {/* Danger zone */}
      <div className="rounded-lg border border-destructive/40 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account, all modules, and email history. This cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Delete my account
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
    </div>
  );
}
