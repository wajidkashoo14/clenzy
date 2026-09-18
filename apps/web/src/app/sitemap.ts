import type { MetadataRoute } from 'next';
import { brand } from '@/content/brand';
import { SERVICE_AREAS } from '@/content/locations';
import { SERVICE_CATEGORIES } from '@/content/services';

/**
 * Static routes only — there's no CMS/blog yet (see docs/SEO_AND_PERFORMANCE.md
 * §"Sitemap", which also lists blog posts once that ships). Excludes
 * account/cart/checkout/admin per the same doc, none of which exist yet either.
 */
const STATIC_ROUTES = [
  '',
  '/services',
  '/pricing',
  '/how-it-works',
  '/about',
  '/locations',
  '/contact',
  '/business',
  '/faq',
  '/offers',
  '/book',
  '/terms',
  '/privacy',
  '/refund-policy',
  '/delivery-policy',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${brand.siteUrl}${path}`,
    lastModified: now,
  }));

  const serviceEntries: MetadataRoute.Sitemap = SERVICE_CATEGORIES.map((category) => ({
    url: `${brand.siteUrl}/services/${category.slug}`,
    lastModified: now,
  }));

  const locationEntries: MetadataRoute.Sitemap = SERVICE_AREAS.map((area) => ({
    url: `${brand.siteUrl}/locations/${area.slug}`,
    lastModified: now,
  }));

  return [...staticEntries, ...serviceEntries, ...locationEntries];
}
