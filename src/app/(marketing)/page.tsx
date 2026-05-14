import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LandingPageContent from '@/components/marketing/LandingPageContent';

const META_TITLE = 'Daily Brief - Your Morning Brief, Curated by AI';
const META_DESCRIPTION =
  'One personalized email, every morning. Real-time weather, news, markets, and more - written by AI, configured by you. Free to start.';

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    type: 'website',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'Daily Brief' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: ['/og.png'],
  },
};

export default function LandingPage({
  searchParams,
}: {
  searchParams?: { error?: string; error_description?: string; deleted?: string };
}) {
  if (searchParams?.error) {
    const params = new URLSearchParams();
    params.set('error', searchParams.error);
    if (searchParams.error_description) params.set('error_description', searchParams.error_description);
    redirect(`/login?${params.toString()}`);
  }

  return <LandingPageContent deleted={searchParams?.deleted === 'true'} />;
}
