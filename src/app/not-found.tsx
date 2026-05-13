import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: '#0a0a0a', color: '#ededed' }}
    >
      <div className="w-full max-w-sm text-center">
        <p className="mb-3 text-xs tracking-widest" style={{ color: '#444' }}>
          404
        </p>

        <h1
          className="mb-6 text-2xl tracking-tight"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          This page doesn&apos;t exist.
        </h1>

        <Link
          href="/"
          className="inline-block rounded-none border px-5 py-2 text-xs tracking-wide transition-colors"
          style={{ borderColor: '#222', color: '#888' }}
        >
          ← Back to Daily Brief
        </Link>
      </div>
    </div>
  );
}
