import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // Block crawling on every non-production Vercel deployment (preview URLs,
  // branch deploys). They share the prod codebase and would otherwise be
  // indexed under the *.vercel.app domain — duplicate content that hurts
  // SEO and leaks pre-launch work.
  const isProd = process.env.VERCEL_ENV === 'production';
  if (!isProd) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/'],
      },
    ],
  };
}
