import type {
  CreateBannerInput,
  CreateFaqInput,
  CreateTestimonialInput,
  ReorderContentInput,
  UpdateBannerInput,
  UpdateFaqInput,
  UpdateTestimonialInput,
} from '@clenzy/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';

export interface AdminFaq {
  _id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AdminTestimonial {
  _id: string;
  name: string;
  area?: string;
  rating: number;
  text: string;
  image?: string;
  isFeatured: boolean;
  isActive: boolean;
  sourceReviewId?: string;
}

export interface AdminBanner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
  ctaText?: string;
  ctaLink?: string;
  placement: 'home_hero' | 'home_strip' | 'offers';
  startsAt?: string;
  endsAt?: string;
  sortOrder: number;
  isActive: boolean;
}

// --- FAQs ----------------------------------------------------------------
export function listFaqs(): Promise<{ faqs: AdminFaq[] }> {
  return apiGet('/api/v1/admin/content/faqs');
}
export function createFaq(input: CreateFaqInput): Promise<{ faq: AdminFaq }> {
  return apiPost('/api/v1/admin/content/faqs', input);
}
export function updateFaq(id: string, input: UpdateFaqInput): Promise<{ faq: AdminFaq }> {
  return apiPatch(`/api/v1/admin/content/faqs/${id}`, input);
}
export function reorderFaqs(input: ReorderContentInput): Promise<null> {
  return apiPost('/api/v1/admin/content/faqs/reorder', input);
}
export function deactivateFaq(id: string): Promise<{ faq: AdminFaq }> {
  return apiDelete(`/api/v1/admin/content/faqs/${id}`);
}

// --- Testimonials ----------------------------------------------------------
export function listTestimonials(): Promise<{ testimonials: AdminTestimonial[] }> {
  return apiGet('/api/v1/admin/content/testimonials');
}
export function createTestimonial(
  input: CreateTestimonialInput,
): Promise<{ testimonial: AdminTestimonial }> {
  return apiPost('/api/v1/admin/content/testimonials', input);
}
export function updateTestimonial(
  id: string,
  input: UpdateTestimonialInput,
): Promise<{ testimonial: AdminTestimonial }> {
  return apiPatch(`/api/v1/admin/content/testimonials/${id}`, input);
}
export function deactivateTestimonial(id: string): Promise<{ testimonial: AdminTestimonial }> {
  return apiDelete(`/api/v1/admin/content/testimonials/${id}`);
}

// --- Banners -----------------------------------------------------------------
export function listBanners(): Promise<{ banners: AdminBanner[] }> {
  return apiGet('/api/v1/admin/content/banners');
}
export function createBanner(input: CreateBannerInput): Promise<{ banner: AdminBanner }> {
  return apiPost('/api/v1/admin/content/banners', input);
}
export function updateBanner(
  id: string,
  input: UpdateBannerInput,
): Promise<{ banner: AdminBanner }> {
  return apiPatch(`/api/v1/admin/content/banners/${id}`, input);
}
export function deactivateBanner(id: string): Promise<{ banner: AdminBanner }> {
  return apiDelete(`/api/v1/admin/content/banners/${id}`);
}
