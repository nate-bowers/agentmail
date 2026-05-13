'use client';

import Link from 'next/link';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: '#0a0a0a', color: '#ededed' }}
    >
      <div className="w-full max-w-sm text-center">
        <h1
          className="mb-4 text-2xl tracking-tight"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          Something went wrong.
        </h1>

        <p className="mb-8 text-sm leading-relaxed" style={{ color: '#555' }}>
          An unexpected error occurred. Try again, or return to your dashboard.
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={reset}
            className="inline-block rounded-none border px-5 py-2 text-xs tracking-wide transition-colors"
            style={{ borderColor: '#333', color: '#ededed' }}
          >
            Try again
          </button>

          <Link
            href="/dashboard"
            className="text-xs transition-colors"
            style={{ color: '#444' }}
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
