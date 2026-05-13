'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export default function DeletedToast() {
  useEffect(() => {
    toast('Your account has been deleted.');
    // Remove the query param without a full reload
    const url = new URL(window.location.href);
    url.searchParams.delete('deleted');
    window.history.replaceState({}, '', url.toString());
  }, []);

  return null;
}
