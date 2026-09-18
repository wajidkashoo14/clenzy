/**
 * Admin catalog endpoints return the raw Mongoose documents (see
 * apps/api/src/models/ServiceCategory.ts and ServiceItem.ts), not the
 * slimmer customer-facing `ServiceCategoryPayload`/`ServiceItemPayload`
 * from @clenzy/shared — same convention as features/admin/types.ts.
 */

export interface AdminImage {
  url: string;
  publicId: string;
  alt: string;
}

export interface AdminSeo {
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface AdminCategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  icon: string;
  image?: AdminImage;
  turnaroundHours: number;
  expressAvailable: boolean;
  sortOrder: number;
  isActive: boolean;
  seo?: AdminSeo;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTieredPricingRow {
  minQty: number;
  unitPrice: number;
}

export interface AdminItem {
  _id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  careNote?: string;
  unit: 'piece' | 'kg' | 'sqft' | 'set' | 'pair';
  price: number;
  mrp?: number;
  expressPrice?: number;
  taxRatePercent: number;
  hsnCode?: string;
  minQuantity: number;
  maxQuantity: number;
  turnaroundHours?: number;
  tieredPricing?: AdminTieredPricingRow[];
  image?: AdminImage;
  sortOrder: number;
  isActive: boolean;
  isPopular: boolean;
  availableInAreas: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminPriceHistoryRow {
  _id: string;
  oldPrice: number;
  newPrice: number;
  changedBy: { _id: string; name?: string; phone: string } | null;
  reason?: string;
  createdAt: string;
}

export interface BulkRepriceRow {
  itemId: string;
  name: string;
  oldPrice: number;
  newPrice: number;
}

export interface CsvPreviewRow {
  itemId: string;
  name: string;
  valid: boolean;
  error?: string;
  oldPrice?: number;
  newPrice?: number;
}
