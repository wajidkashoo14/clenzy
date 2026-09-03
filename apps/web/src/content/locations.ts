/**
 * PLACEHOLDER coverage data — real serviceable pin codes and areas must be
 * confirmed by the business owner (docs/PROJECT_REQUIREMENTS.md §7). Mirrors
 * docs/DATABASE.md's `serviceAreas` shape for an easy Phase 5 swap to a live
 * API call. Per docs/SEO_AND_PERFORMANCE.md §4: "ship 4–6 excellent area
 * pages, not 25 thin ones" — each entry below needs genuinely distinct copy.
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

export function checkPincodeServiceable(pincode: string): ServiceArea | undefined {
  return SERVICE_AREAS.find((area) => area.pincode === pincode);
}
