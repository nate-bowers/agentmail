'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function TestSendButton() {
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      const res = await fetch('/api/email/test-send', { method: 'POST' });
      const body = await res.json();

      if (res.status === 429) {
        toast.error('Daily limit reached', {
          description: 'You can send up to 3 test emails per day.',
        });
        return;
      }

      if (!res.ok) {
        toast.error('Failed to send', {
          description: body.message ?? body.error ?? 'Something went wrong.',
        });
        return;
      }

      toast.success('Test brief sent!', {
        description: `Check your inbox. ${body.remaining} test send${body.remaining === 1 ? '' : 's'} remaining today.`,
      });
    } catch {
      toast.error('Failed to send', { description: 'A network error occurred.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSend}
      disabled={loading}
      className="gap-1.5"
    >
      <Send className="h-3.5 w-3.5" />
      {loading ? 'Sending…' : 'Send test brief'}
    </Button>
  );
}
