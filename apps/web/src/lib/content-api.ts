/**
 * Server-side content fetches for SSG/ISR pages — same pattern as
 * lib/catalog-api.ts, and busted by the same `/api/revalidate` webhook (see
 * services/revalidation.service.ts on the API, called from
 * adminContent.service.ts on every FAQ/testimonial/banner write).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
const REVALIDATE_SECONDS = 3600;

export interface PublicFaq {
  _id: string;
  question: string;
  answer: string;
  category: string;
}

export interface PublicTestimonial {
  _id: string;
  name: string;
  area?: string;
  rating: number;
  text: string;
  image?: string;
}

export interface PublicBanner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
  ctaText?: string;
  ctaLink?: string;
  placement: 'home_hero' | 'home_strip' | 'offers';
}

async function contentFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS, tags: ['catalog'] },
  });

  if (!response.ok) {
    throw new Error(`Content fetch failed: GET ${path} → ${response.status}`);
  }

  const body = (await response.json()) as { success: true; data: T };
  return body.data;
}

export async function getFaqs(): Promise<PublicFaq[]> {
  const { faqs } = await contentFetch<{ faqs: PublicFaq[] }>('/api/v1/content/faqs');
  return faqs;
}

export async function getTestimonials(): Promise<PublicTestimonial[]> {
  const { testimonials } = await contentFetch<{ testimonials: PublicTestimonial[] }>(
    '/api/v1/content/testimonials',
  );
  return testimonials;
}

export async function getBanners(placement: PublicBanner['placement']): Promise<PublicBanner[]> {
  const { banners } = await contentFetch<{ banners: PublicBanner[] }>(
    `/api/v1/content/banners?placement=${placement}`,
  );
  return banners;
}
