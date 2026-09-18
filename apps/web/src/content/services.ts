import type { LucideIcon } from 'lucide-react';
import { Footprints, Home, Layers, Shirt, ShirtIcon, Sofa, Sparkles, Wind } from 'lucide-react';

/**
 * PLACEHOLDER catalog data — prices are illustrative only, not real Clenzy
 * pricing (docs/PROJECT_REQUIREMENTS.md §7). As of Phase 5, pages that show
 * a PRICE (`/services`, `/services/[slug]`, `/pricing`, the homepage
 * services grid) fetch live data from the API instead (see
 * lib/catalog-api.ts) — this array's `items`/prices are no longer read
 * anywhere. It's kept only for `name`/`slug` — nav links, the sitemap, and
 * form dropdowns that don't display a price. The same data is seeded into
 * MongoDB by apps/api/scripts/seed-catalog.ts.
 */
export interface ServiceItem {
  name: string;
  slug: string;
  unit: 'piece' | 'pair' | 'sqft' | 'set';
  priceRupees: number;
  careNote?: string;
}

export interface ServiceCategory {
  name: string;
  slug: string;
  icon: LucideIcon;
  shortDescription: string;
  description: string;
  turnaroundHours: number;
  expressAvailable: boolean;
  items: ServiceItem[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    name: 'Laundry',
    slug: 'laundry',
    icon: Shirt,
    shortDescription: 'Everyday wash & fold for your daily wear.',
    description:
      'Machine-washed, carefully sorted by colour and fabric, folded and packed — ready to put away, not just clean.',
    turnaroundHours: 48,
    expressAvailable: true,
    items: [
      { name: 'Shirt', slug: 'shirt', unit: 'piece', priceRupees: 40 },
      { name: 'T-shirt', slug: 't-shirt', unit: 'piece', priceRupees: 35 },
      { name: 'Trouser', slug: 'trouser', unit: 'piece', priceRupees: 50 },
      { name: 'Jeans', slug: 'jeans', unit: 'piece', priceRupees: 60 },
      { name: 'Kurta', slug: 'kurta', unit: 'piece', priceRupees: 45 },
      { name: 'Bedsheet (single)', slug: 'bedsheet-single', unit: 'piece', priceRupees: 80 },
      { name: 'Bedsheet (double)', slug: 'bedsheet-double', unit: 'piece', priceRupees: 120 },
      { name: 'Towel', slug: 'towel', unit: 'piece', priceRupees: 30 },
    ],
  },
  {
    name: 'Wash & Iron',
    slug: 'wash-and-iron',
    icon: ShirtIcon,
    shortDescription: 'Washed and pressed, crease-free and ready to wear.',
    description: 'Everything from our Laundry line, finished with a professional steam press.',
    turnaroundHours: 48,
    expressAvailable: true,
    items: [
      { name: 'Shirt', slug: 'shirt', unit: 'piece', priceRupees: 60 },
      { name: 'Trouser', slug: 'trouser', unit: 'piece', priceRupees: 70 },
      { name: 'Kurta', slug: 'kurta', unit: 'piece', priceRupees: 65 },
      { name: 'Kurta Pyjama (set)', slug: 'kurta-pyjama', unit: 'set', priceRupees: 110 },
    ],
  },
  {
    name: 'Dry Cleaning',
    slug: 'dry-cleaning',
    icon: Sparkles,
    shortDescription: 'Gentle solvent cleaning for delicate and structured garments.',
    description:
      'Suits, sarees, sherwanis, and winter wear that need more care than a regular wash — cleaned and pressed by hand.',
    turnaroundHours: 72,
    expressAvailable: true,
    items: [
      { name: 'Suit (2-piece)', slug: 'suit-2pc', unit: 'set', priceRupees: 350 },
      { name: 'Blazer', slug: 'blazer', unit: 'piece', priceRupees: 200 },
      { name: 'Saree (plain)', slug: 'saree-plain', unit: 'piece', priceRupees: 180 },
      { name: 'Saree (heavy work)', slug: 'saree-heavy', unit: 'piece', priceRupees: 350 },
      { name: 'Sherwani', slug: 'sherwani', unit: 'piece', priceRupees: 400 },
      {
        name: 'Pheran',
        slug: 'pheran',
        unit: 'piece',
        priceRupees: 300,
        careNote: 'Hand-finished for embroidered pherans',
      },
      { name: 'Jacket', slug: 'jacket', unit: 'piece', priceRupees: 250 },
      { name: 'Sweater', slug: 'sweater', unit: 'piece', priceRupees: 150 },
    ],
  },
  {
    name: 'Specialty Care',
    slug: 'specialty-care',
    icon: Wind,
    shortDescription: 'Pashmina, shawls, and heirloom woollens — handled with extra care.',
    description:
      'Fine woollens need gentler chemistry and hand-finishing. This line is for the pieces you’d never trust to a regular wash.',
    turnaroundHours: 96,
    expressAvailable: false,
    items: [
      { name: 'Pashmina shawl', slug: 'pashmina-shawl', unit: 'piece', priceRupees: 450 },
      { name: 'Woollen shawl', slug: 'woollen-shawl', unit: 'piece', priceRupees: 300 },
      {
        name: 'Heavy embroidered shawl',
        slug: 'embroidered-shawl',
        unit: 'piece',
        priceRupees: 600,
      },
    ],
  },
  {
    name: 'Shoe & Bag Cleaning',
    slug: 'shoe-bag-cleaning',
    icon: Footprints,
    shortDescription: 'Deep cleaning for footwear and bags, without damaging materials.',
    description: 'Sneakers, leather shoes, and bags cleaned and conditioned by hand.',
    turnaroundHours: 72,
    expressAvailable: false,
    items: [
      { name: 'Sneakers (pair)', slug: 'sneakers', unit: 'pair', priceRupees: 150 },
      { name: 'Leather shoes (pair)', slug: 'leather-shoes', unit: 'pair', priceRupees: 200 },
      { name: 'Handbag', slug: 'handbag', unit: 'piece', priceRupees: 250 },
    ],
  },
  {
    name: 'Carpet & Rug Cleaning',
    slug: 'carpet-cleaning',
    icon: Layers,
    shortDescription: 'Deep cleaning for carpets, namdas, and hand-knotted rugs.',
    description:
      'Pickup, deep clean, and return for carpets too large to wash at home — priced by area.',
    turnaroundHours: 96,
    expressAvailable: false,
    items: [
      { name: 'Carpet (per sq. ft.)', slug: 'carpet-sqft', unit: 'sqft', priceRupees: 25 },
      {
        name: 'Namda / Gabba rug (per sq. ft.)',
        slug: 'namda-sqft',
        unit: 'sqft',
        priceRupees: 20,
      },
    ],
  },
  {
    name: 'Sofa & Curtain Cleaning',
    slug: 'sofa-curtain-cleaning',
    icon: Sofa,
    shortDescription: 'In-place upholstery cleaning and pickup service for curtains.',
    description: 'Sofas cleaned at your home; curtains picked up, cleaned, and rehung.',
    turnaroundHours: 96,
    expressAvailable: false,
    items: [
      { name: 'Sofa (per seat)', slug: 'sofa-seat', unit: 'piece', priceRupees: 350 },
      { name: 'Curtain (per panel)', slug: 'curtain-panel', unit: 'piece', priceRupees: 150 },
      { name: 'Mattress (single)', slug: 'mattress-single', unit: 'piece', priceRupees: 500 },
      { name: 'Mattress (double)', slug: 'mattress-double', unit: 'piece', priceRupees: 700 },
    ],
  },
  {
    name: 'Home Essentials',
    slug: 'home-essentials',
    icon: Home,
    shortDescription: 'Quilts, blankets, and other bulky home textiles.',
    description:
      'The bulky items that don’t fit in a home washing machine, cleaned properly and returned fresh.',
    turnaroundHours: 72,
    expressAvailable: false,
    items: [
      { name: 'Quilt / Razai', slug: 'quilt', unit: 'piece', priceRupees: 250 },
      { name: 'Blanket', slug: 'blanket', unit: 'piece', priceRupees: 180 },
    ],
  },
];
