'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: '#0a0a0a',
          color: '#ededed',
          margin: 0,
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: '24rem', width: '100%', textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'Georgia, "Times New Roman", ui-serif, serif',
              fontSize: '1.5rem',
              letterSpacing: '-0.01em',
              marginBottom: '1rem',
            }}
          >
            Something went wrong.
          </h1>

          <p style={{ color: '#555', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            A critical error occurred. Please reload the page.
          </p>

          <button
            onClick={reset}
            style={{
              border: '1px solid #333',
              background: 'transparent',
              color: '#ededed',
              padding: '0.5rem 1.25rem',
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
