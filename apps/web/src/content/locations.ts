/**
 * PLACEHOLDER coverage data — real serviceable pin codes and areas must be
 * confirmed by the business owner (docs/PROJECT_REQUIREMENTS.md §7). Per
 * docs/SEO_AND_PERFORMANCE.md §4: "ship 4–6 excellent area pages, not 25
 * thin ones" — each entry below needs genuinely distinct copy.
 *
 * The same pincodes/areas are now also seeded into MongoDB
 * (apps/api/scripts/seed-catalog.ts) and served live via `/areas/check` —
 * the Hero pincode widget uses that endpoint, not this file (see
 * lib/catalog-api.ts). This file remains the source for `/locations` and
 * `/locations/[area]`'s descriptive copy (landmarks, area blurbs), which
 * has no equivalent field in docs/DATABASE.md's `serviceAreas` schema and
 * wasn't in Phase 5's explicit task list — migrating those pages to live
 * data is a reasonable follow-up, not a Phase 5 requirement.
 */
export interface ServiceArea {
  name: string;
  slug: string;
  pincode: string;
  description: string;
  landmarks: string[];
  expressAvailable: boolean;
}

export const SERVICE_AREAS: ServiceArea[] = [
  {
    name: 'Rajbagh',
    slug: 'rajbagh',
    pincode: '190008',
    description:
      'Full pickup and delivery coverage across Rajbagh, including the residential lanes off Boulevard Road.',
    landmarks: ['Amira Kadal', 'Boulevard Road', 'Jawahar Nagar'],
    expressAvailable: true,
  },
  {
    name: 'Lal Chowk',
    slug: 'lal-chowk',
    pincode: '190001',
    description: 'Same-day pickup available for orders placed before the daily cutoff.',
    landmarks: ['Residency Road', 'Regal Chowk', 'Polo View'],
    expressAvailable: true,
  },
  {
    name: 'Hyderpora',
    slug: 'hyderpora',
    pincode: '190014',
    description: 'Covering the Hyderpora Bypass corridor and adjoining residential colonies.',
    landmarks: ['Hyderpora Bypass', 'Rawalpora'],
    expressAvailable: false,
  },
  {
    name: 'Nishat',
    slug: 'nishat',
    pincode: '190006',
    description: 'Pickup and delivery along the Boulevard, including areas near Nishat Garden.',
    landmarks: ['Nishat Garden', 'Foreshore Road'],
    expressAvailable: false,
  },
  {
    name: 'Dalgate',
    slug: 'dalgate',
    pincode: '190001',
    description: 'Covering Dalgate and the surrounding houseboats and guesthouses.',
    landmarks: ['Dalgate Bridge', 'Residency Road'],
    expressAvailable: true,
  },
];

export function getServiceAreaBySlug(slug: string): ServiceArea | undefined {
  return SERVICE_AREAS.find((area) => area.slug === slug);
}
