import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className="font-[family-name:var(--font-inter)] antialiased animate-in fade-in duration-200 overflow-x-hidden"
        style={{ fontFeatureSettings: '"cv11", "ss01"' }}
      >
        {children}
      </body>
    </html>
  );
}
