import type {
  PricingGroupPayload,
  ServiceAreaPayload,
  ServiceCategoryPayload,
} from '@clenzy/shared';

/**
 * Server-side catalog fetches for SSG/ISR pages — see docs/ARCHITECTURE.md
 * §6 ("build/revalidate time → Next.js fetches catalog from API → static
 * HTML"). Every call is tagged `catalog` so `revalidateTag('catalog')` in
 * app/api/revalidate/route.ts can invalidate all of them at once; the
 * 3600s window is the time-based fallback until that's wired up to a real
 * trigger (Phase 12 admin repricing).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
const REVALIDATE_SECONDS = 3600;

async function catalogFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS, tags: ['catalog'] },
  });

  if (!response.ok) {
    throw new Error(`Catalog fetch failed: GET ${path} → ${response.status}`);
  }

  const body = (await response.json()) as { success: true; data: T };
  return body.data;
}

export async function getCategories(includeItems = false): Promise<ServiceCategoryPayload[]> {
  const { categories } = await catalogFetch<{ categories: ServiceCategoryPayload[] }>(
    `/api/v1/services${includeItems ? '?includeItems=true' : ''}`,
  );
  return categories;
}

export async function getCategoryBySlug(slug: string): Promise<ServiceCategoryPayload | null> {
  const response = await fetch(`${API_URL}/api/v1/services/${slug}`, {
    next: { revalidate: REVALIDATE_SECONDS, tags: ['catalog'] },
  });

  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`Catalog fetch failed: GET /services/${slug} → ${response.status}`);

  const body = (await response.json()) as {
    success: true;
    data: { category: ServiceCategoryPayload };
  };
  return body.data.category;
}

export async function getPricingGroups(): Promise<PricingGroupPayload[]> {
  const { groups } = await catalogFetch<{ groups: PricingGroupPayload[] }>('/api/v1/pricing');
  return groups;
}

export async function getAreas(): Promise<ServiceAreaPayload[]> {
  const { areas } = await catalogFetch<{ areas: ServiceAreaPayload[] }>('/api/v1/areas');
  return areas;
}
