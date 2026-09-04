import type { ServiceCategoryPayload, ServiceItemPayload } from '@clenzy/shared';
import { isValidObjectId } from 'mongoose';
import { ServiceCategory, type ServiceCategoryDocument } from '../models/ServiceCategory.js';
import { ServiceItem, type ServiceItemDocument } from '../models/ServiceItem.js';
import { AppError } from '../utils/AppError.js';

type CategoryLean = ServiceCategoryDocument & { _id: unknown };
type ItemLean = ServiceItemDocument & { _id: unknown };

function toItemPayload(item: ItemLean): ServiceItemPayload {
  return {
    id: String(item._id),
    categoryId: String(item.categoryId),
    name: item.name,
    slug: item.slug,
    description: item.description,
    careNote: item.careNote,
    unit: item.unit,
    price: item.price,
    mrp: item.mrp,
    expressPrice: item.expressPrice,
    taxRatePercent: item.taxRatePercent,
    minQuantity: item.minQuantity,
    maxQuantity: item.maxQuantity,
    turnaroundHours: item.turnaroundHours,
    tieredPricing: item.tieredPricing,
    image: item.image?.url
      ? { url: item.image.url, publicId: item.image.publicId, alt: item.image.alt }
      : undefined,
    isPopular: item.isPopular,
  };
}

function toCategoryPayload(category: CategoryLean, items?: ItemLean[]): ServiceCategoryPayload {
  const payload: ServiceCategoryPayload = {
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    description: category.description,
    shortDescription: category.shortDescription,
    icon: category.icon,
    image: category.image?.url
      ? { url: category.image.url, publicId: category.image.publicId, alt: category.image.alt }
      : undefined,
    turnaroundHours: category.turnaroundHours,
    expressAvailable: category.expressAvailable,
  };

  if (items) {
    payload.itemCount = items.length;
    payload.startingPrice = items.length > 0 ? Math.min(...items.map((i) => i.price)) : undefined;
    payload.items = items.map(toItemPayload);
  }

  return payload;
}

async function getActiveItemsForCategory(categoryId: unknown): Promise<ItemLean[]> {
  return ServiceItem.find({ categoryId, isActive: true }).sort({ sortOrder: 1 }).lean();
}

export async function getCategories(includeItems: boolean): Promise<ServiceCategoryPayload[]> {
  const categories = await ServiceCategory.find({ isActive: true }).sort({ sortOrder: 1 }).lean();

  return Promise.all(
    categories.map(async (category) => {
      const items = await getActiveItemsForCategory(category._id);
      // itemCount/startingPrice are always computed (index cards need them);
      // the full items[] array is only attached when the caller asked for it.
      const payload = toCategoryPayload(category, items);
      if (!includeItems) payload.items = undefined;
      return payload;
    }),
  );
}

export async function getCategoryBySlug(slug: string): Promise<ServiceCategoryPayload> {
  const category = await ServiceCategory.findOne({ slug, isActive: true }).lean();
  if (!category) throw AppError.notFound('This service category was not found.');

  const items = await getActiveItemsForCategory(category._id);
  return toCategoryPayload(category, items);
}

export interface ItemFilters {
  categoryId?: string;
  q?: string;
  popular?: boolean;
  areaId?: string;
}

export async function getItems(filters: ItemFilters): Promise<ServiceItemPayload[]> {
  const query: Record<string, unknown> = { isActive: true };
  if (filters.categoryId && isValidObjectId(filters.categoryId))
    query.categoryId = filters.categoryId;
  if (filters.popular) query.isPopular = true;
  if (filters.q) query.$text = { $search: filters.q };
  if (filters.areaId && isValidObjectId(filters.areaId)) {
    query.$or = [{ availableInAreas: { $size: 0 } }, { availableInAreas: filters.areaId }];
  }

  const items = await ServiceItem.find(query).sort({ sortOrder: 1 }).lean();
  return items.map(toItemPayload);
}

export async function getItemById(id: string): Promise<ServiceItemPayload> {
  if (!isValidObjectId(id)) throw AppError.notFound('This item was not found.');
  const item = await ServiceItem.findOne({ _id: id, isActive: true }).lean();
  if (!item) throw AppError.notFound('This item was not found.');
  return toItemPayload(item);
}

export async function getPricing(): Promise<
  { category: ServiceCategoryPayload; items: ServiceItemPayload[] }[]
> {
  const categories = await ServiceCategory.find({ isActive: true }).sort({ sortOrder: 1 }).lean();

  return Promise.all(
    categories.map(async (category) => {
      const items = await getActiveItemsForCategory(category._id);
      return { category: toCategoryPayload(category), items: items.map(toItemPayload) };
    }),
  );
}
