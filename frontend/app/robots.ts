import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = 'https://playlog-tau.vercel.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/search', '/game/', '/user/', '/activity'],
        disallow: ['/profile', '/library', '/journal', '/lists', '/steam', '/recommendations', '/onboarding', '/wrapped', '/login', '/forgot-password', '/update-password'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
