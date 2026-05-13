'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ResendButtonProps {
  /** Whether a brief was successfully sent today */
  sentToday: boolean;
  /** Whether a brief was sent within the last 6 hours (cooldown active) */
  onCooldown: boolean;
}

export default function ResendButton({ sentToday, onCooldown }: ResendButtonProps) {
  const [loading, setLoading] = useState(false);
  const [justSent, setJustSent] = useState(false);

  // Only render if a brief has been sent today
  if (!sentToday) return null;

  async function handleResend() {
    setLoading(true);
    try {
      const res = await fetch('/api/email/resend', { method: 'POST' });
      const body = await res.json();

      if (res.status === 429) {
        toast.error('Too soon', {
          description: "Your last brief was sent less than 6 hours ago. Try again later.",
        });
        return;
      }

      if (!res.ok) {
        toast.error('Failed to resend', {
          description: body.message ?? body.error ?? 'Something went wrong.',
        });
        return;
      }

      setJustSent(true);
      toast.success("Today's brief resent!", {
        description: 'Check your inbox in a moment.',
      });
    } catch {
      toast.error('Failed to resend', { description: 'A network error occurred.' });
    } finally {
      setLoading(false);
    }
  }

  const disabled = onCooldown || loading || justSent;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleResend}
      disabled={disabled}
      className="gap-1.5 text-muted-foreground"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
      {justSent ? 'Sent!' : loading ? 'Sending…' : "Resend today's brief"}
    </Button>
  );
}
