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
  title: "Daily Brief",
  description: "Your personalized daily email brief, curated by AI.",
  // Replace public/icon.png, public/favicon.ico, and public/apple-touch-icon.png
  // with your actual logo files before launch.
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
        className="font-[family-name:var(--font-inter)] antialiased animate-in fade-in duration-200"
        style={{ fontFeatureSettings: '"cv11", "ss01"' }}
      >
        {children}
      </body>
    </html>
  );
}
