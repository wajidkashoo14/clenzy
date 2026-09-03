import type { MetadataRoute } from 'next';
import { brand } from '@/content/brand';

/** See docs/SEO_AND_PERFORMANCE.md §"robots.txt". */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/cart', '/checkout', '/api'],
    },
    sitemap: `${brand.siteUrl}/sitemap.xml`,
  };
}
