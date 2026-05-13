import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0D0D0F',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Purple glow */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '700px',
            height: '400px',
            background: 'radial-gradient(ellipse at center, rgba(124, 92, 252, 0.25) 0%, transparent 70%)',
          }}
        />

        {/* Purple dot */}
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#7C5CFC',
            marginBottom: '28px',
          }}
        />

        {/* Wordmark */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: '700',
            color: '#ffffff',
            letterSpacing: '-2px',
            lineHeight: '1',
            marginBottom: '20px',
          }}
        >
          Daily Brief
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255, 255, 255, 0.55)',
            letterSpacing: '0px',
            fontWeight: '400',
          }}
        >
          Your morning, curated.
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.25)',
            letterSpacing: '1px',
            fontFamily: 'monospace',
          }}
        >
          dailybriefmail.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
