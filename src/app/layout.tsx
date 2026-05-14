import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-headline",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://dailybriefmail.com'),
  title: { default: 'Daily Brief', template: '%s — Daily Brief' },
  description: 'Your personalized daily email brief, curated by AI.',
  openGraph: {
    title: 'Daily Brief',
    description: 'Your morning, curated.',
    url: 'https://dailybriefmail.com',
    siteName: 'Daily Brief',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'Daily Brief' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daily Brief',
    description: 'Your morning, curated.',
    images: ['/api/og'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icon.png?v=2', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' }],
    shortcut: { url: '/favicon.ico?v=2' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body
        className="font-[family-name:var(--font-inter)] antialiased animate-in fade-in duration-200 overflow-x-hidden"
        style={{ fontFeatureSettings: '"cv11", "ss01"' }}
      >
        {children}
      </body>
    </html>
  );
}
