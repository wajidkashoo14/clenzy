/**
 * Seeds serviceCategories/serviceItems/serviceAreas with the same
 * illustrative catalog data that shipped as static placeholder content in
 * Phase 3 (apps/web/src/content/services.ts, locations.ts) — see
 * docs/DEVELOPMENT_PLAN.md Phase 5 ("seed script with the real price list
 * from Phase 0"). No real price list exists yet (docs/PROJECT_REQUIREMENTS.md
 * §7 — the business owner hasn't supplied one), so this migrates the exact
 * same clearly-illustrative numbers into the database rather than inventing
 * new ones. Idempotent: safe to re-run, replaces existing catalog documents.
 *
 * Usage: npm run seed:catalog --workspace=apps/api
 */
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { logger } from '../src/config/logger.js';
import { ServiceArea } from '../src/models/ServiceArea.js';
import { ServiceCategory } from '../src/models/ServiceCategory.js';
import { ServiceItem } from '../src/models/ServiceItem.js';

interface SeedItem {
  name: string;
  slug: string;
  unit: 'piece' | 'pair' | 'sqft' | 'set';
  priceRupees: number;
  careNote?: string;
}

interface SeedCategory {
  name: string;
  slug: string;
  icon: string;
  shortDescription: string;
  description: string;
  turnaroundHours: number;
  expressAvailable: boolean;
  items: SeedItem[];
}

const CATEGORIES: SeedCategory[] = [
  {
    name: 'Laundry',
    slug: 'laundry',
    icon: 'Shirt',
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
    icon: 'ShirtIcon',
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
    icon: 'Sparkles',
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
    icon: 'Wind',
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
    icon: 'Footprints',
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
    icon: 'Layers',
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
    icon: 'Sofa',
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
    icon: 'Home',
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

const AREAS: { name: string; slug: string; pincode: string; expressAvailable: boolean }[] = [
  { name: 'Rajbagh', slug: 'rajbagh', pincode: '190008', expressAvailable: true },
  { name: 'Lal Chowk', slug: 'lal-chowk', pincode: '190001', expressAvailable: true },
  { name: 'Hyderpora', slug: 'hyderpora', pincode: '190014', expressAvailable: false },
  { name: 'Nishat', slug: 'nishat', pincode: '190006', expressAvailable: false },
  { name: 'Dalgate', slug: 'dalgate', pincode: '190001', expressAvailable: true },
];

async function seed(): Promise<void> {
  await connectDatabase();

  await ServiceItem.deleteMany({});
  await ServiceCategory.deleteMany({});
  await ServiceArea.deleteMany({});

  for (const [categoryIndex, category] of CATEGORIES.entries()) {
    const doc = await ServiceCategory.create({
      name: category.name,
      slug: category.slug,
      description: category.description,
      shortDescription: category.shortDescription,
      icon: category.icon,
      turnaroundHours: category.turnaroundHours,
      expressAvailable: category.expressAvailable,
      sortOrder: categoryIndex,
      isActive: true,
    });

    await ServiceItem.insertMany(
      category.items.map((item, itemIndex) => ({
        categoryId: doc._id,
        name: item.name,
        slug: item.slug,
        unit: item.unit,
        price: item.priceRupees * 100,
        careNote: item.careNote,
        taxRatePercent: 0,
        minQuantity: 1,
        maxQuantity: 99,
        sortOrder: itemIndex,
        isActive: true,
        isPopular: false,
        availableInAreas: [],
      })),
    );

    logger.info(`Seeded "${category.name}" — ${category.items.length} items`);
  }

  await ServiceArea.insertMany(
    AREAS.map((area) => ({
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      area: area.name,
      slug: area.slug,
      pincodes: [area.pincode],
      pickupAvailable: true,
      deliveryAvailable: true,
      expressAvailable: area.expressAvailable,
      deliveryFee: 0,
      serviceableCategories: [],
      isActive: true,
    })),
  );
  logger.info(`Seeded ${AREAS.length} service areas`);

  await disconnectDatabase();
}

seed()
  .then(() => {
    logger.info('Catalog seed complete');
    process.exit(0);
  })
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Catalog seed failed');
    process.exit(1);
  });
