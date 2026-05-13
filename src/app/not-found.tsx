import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6">
      {/* Decorative background 404 */}
      <p
        className="pointer-events-none absolute select-none text-[clamp(120px,30vw,280px)] font-black leading-none text-gray-50"
        aria-hidden="true"
      >
        404
      </p>

      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/20 bg-brand-purple-light px-3 py-1 text-xs font-medium text-brand-purple">
          Daily Brief
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          This page doesn&rsquo;t exist.
        </h1>
        <p className="text-sm text-ink-muted">
          It may have moved, or it never existed in the first place.
        </p>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
