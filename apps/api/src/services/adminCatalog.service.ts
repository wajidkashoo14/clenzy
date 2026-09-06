import type {
  BulkChangeCategoryInput,
  BulkItemActionInput,
  CreateCategoryInput,
  CreateItemInput,
  CsvImportCommitInput,
  CsvImportPreviewInput,
  ItemListQuery,
  PricingGridUpdateInput,
  ReorderCategoriesInput,
  UpdateCategoryInput,
  UpdateItemInput,
} from '@clenzy/shared';
import mongoose, { isValidObjectId, type FilterQuery } from 'mongoose';
import { PriceHistory } from '../models/PriceHistory.js';
import { ServiceCategory, type ServiceCategoryDocument } from '../models/ServiceCategory.js';
import { ServiceItem, type ServiceItemDocument } from '../models/ServiceItem.js';
import { logAudit } from './auditLog.service.js';
import { triggerCatalogRevalidation } from './revalidation.service.js';
import { AppError } from '../utils/AppError.js';

type CategoryLean = ServiceCategoryDocument & { _id: unknown };
type ItemLean = ServiceItemDocument & { _id: unknown };

interface Actor {
  id: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategoriesAdmin(): Promise<(CategoryLean & { itemCount: number })[]> {
  const categories = await ServiceCategory.find({}).sort({ sortOrder: 1 }).lean();
  const counts = await ServiceItem.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: '$categoryId', count: { $sum: 1 } } },
  ]);
  const countByCategoryId = new Map(counts.map((c) => [String(c._id), c.count]));
  return categories.map((category) => ({
    ...category,
    itemCount: countByCategoryId.get(String(category._id)) ?? 0,
  }));
}

export async function createCategory(
  actor: Actor,
  input: CreateCategoryInput,
): Promise<CategoryLean> {
  const existing = await ServiceCategory.findOne({ slug: input.slug }).lean();
  if (existing)
    throw AppError.badRequest('SLUG_TAKEN', `The slug "${input.slug}" is already in use.`);

  const maxSortOrder = await ServiceCategory.findOne({})
    .sort({ sortOrder: -1 })
    .select('sortOrder')
    .lean();
  const category = await ServiceCategory.create({
    ...input,
    sortOrder: (maxSortOrder?.sortOrder ?? -1) + 1,
  });

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'category.create',
    entityType: 'ServiceCategory',
    entityId: String(category._id),
    after: category.toObject(),
  });
  triggerCatalogRevalidation();
  return category.toObject();
}

export async function updateCategory(
  actor: Actor,
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Category not found.');
  const category = await ServiceCategory.findById(id);
  if (!category) throw AppError.notFound('Category not found.');

  if (input.slug && input.slug !== category.slug) {
    const existing = await ServiceCategory.findOne({ slug: input.slug, _id: { $ne: id } }).lean();
    if (existing)
      throw AppError.badRequest('SLUG_TAKEN', `The slug "${input.slug}" is already in use.`);
  }

  const before = category.toObject();
  Object.assign(category, input);
  await category.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'category.update',
    entityType: 'ServiceCategory',
    entityId: id,
    before,
    after: category.toObject(),
  });
  triggerCatalogRevalidation();
  return category.toObject();
}

export async function reorderCategories(
  actor: Actor,
  input: ReorderCategoriesInput,
): Promise<void> {
  const invalidId = input.orderedIds.find((id) => !isValidObjectId(id));
  if (invalidId)
    throw AppError.badRequest('INVALID_ID', `"${invalidId}" is not a valid category id.`);

  await Promise.all(
    input.orderedIds.map((id, index) =>
      ServiceCategory.updateOne({ _id: id }, { $set: { sortOrder: index } }),
    ),
  );
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'category.reorder',
    entityType: 'ServiceCategory',
    entityId: 'bulk',
    after: input.orderedIds,
  });
  triggerCatalogRevalidation();
}

/**
 * Deactivate (never hard-delete) — see docs/ADMIN_DASHBOARD.md §5. Warns
 * the caller about orphaned active items instead of silently proceeding;
 * pass `force` once the admin has confirmed via that warning.
 */
export async function deactivateCategory(
  actor: Actor,
  id: string,
  force: boolean,
): Promise<{ category: CategoryLean; orphanedItemCount: number }> {
  if (!isValidObjectId(id)) throw AppError.notFound('Category not found.');
  const category = await ServiceCategory.findById(id);
  if (!category) throw AppError.notFound('Category not found.');

  const orphanedItemCount = await ServiceItem.countDocuments({ categoryId: id, isActive: true });
  if (orphanedItemCount > 0 && !force) {
    throw AppError.conflict(
      'CATEGORY_HAS_ACTIVE_ITEMS',
      `This category has ${orphanedItemCount} active item(s).`,
      {
        orphanedItemCount,
      },
    );
  }

  const before = category.toObject();
  category.isActive = false;
  await category.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'category.deactivate',
    entityType: 'ServiceCategory',
    entityId: id,
    before,
    after: category.toObject(),
  });
  triggerCatalogRevalidation();
  return { category: category.toObject(), orphanedItemCount };
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function listItemsAdmin(
  query: ItemListQuery,
): Promise<{ items: ItemLean[]; total: number; page: number; pageSize: number }> {
  const filter: FilterQuery<ServiceItemDocument> = {};
  if (query.categoryId && isValidObjectId(query.categoryId)) filter.categoryId = query.categoryId;
  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'inactive') filter.isActive = false;
  if (query.q) filter.$text = { $search: query.q };

  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    ServiceItem.find(filter).sort({ sortOrder: 1 }).skip(skip).limit(query.pageSize).lean(),
    ServiceItem.countDocuments(filter),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  if (!isValidObjectId(categoryId))
    throw AppError.badRequest('INVALID_CATEGORY', 'Invalid category id.');
  const exists = await ServiceCategory.exists({ _id: categoryId });
  if (!exists) throw AppError.notFound('Category not found.');
}

export async function createItem(actor: Actor, input: CreateItemInput): Promise<ItemLean> {
  await assertCategoryExists(input.categoryId);
  const existing = await ServiceItem.findOne({
    slug: input.slug,
    categoryId: input.categoryId,
  }).lean();
  if (existing)
    throw AppError.badRequest(
      'SLUG_TAKEN',
      `The slug "${input.slug}" is already in use in this category.`,
    );

  const item = await ServiceItem.create(input);

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'item.create',
    entityType: 'ServiceItem',
    entityId: String(item._id),
    after: item.toObject(),
  });
  triggerCatalogRevalidation();
  return item.toObject();
}

export async function updateItem(
  actor: Actor,
  id: string,
  input: UpdateItemInput,
): Promise<ItemLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Item not found.');
  const item = await ServiceItem.findById(id);
  if (!item) throw AppError.notFound('Item not found.');

  if (input.categoryId && input.categoryId !== String(item.categoryId)) {
    await assertCategoryExists(input.categoryId);
  }
  if (input.slug && input.slug !== item.slug) {
    const existing = await ServiceItem.findOne({
      slug: input.slug,
      categoryId: input.categoryId ?? item.categoryId,
      _id: { $ne: id },
    }).lean();
    if (existing)
      throw AppError.badRequest(
        'SLUG_TAKEN',
        `The slug "${input.slug}" is already in use in this category.`,
      );
  }

  const before = item.toObject();
  const oldPrice = item.price;
  Object.assign(item, input);
  await item.save();

  if (input.price !== undefined && input.price !== oldPrice) {
    await PriceHistory.create({
      serviceItemId: id,
      oldPrice,
      newPrice: input.price,
      changedBy: actor.id,
    });
  }
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'item.update',
    entityType: 'ServiceItem',
    entityId: id,
    before,
    after: item.toObject(),
  });
  triggerCatalogRevalidation();
  return item.toObject();
}

export async function deactivateItem(actor: Actor, id: string): Promise<ItemLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Item not found.');
  const item = await ServiceItem.findById(id);
  if (!item) throw AppError.notFound('Item not found.');

  const before = item.toObject();
  item.isActive = false;
  await item.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'item.deactivate',
    entityType: 'ServiceItem',
    entityId: id,
    before,
    after: item.toObject(),
  });
  triggerCatalogRevalidation();
  return item.toObject();
}

export interface PriceHistoryRow {
  _id: unknown;
  serviceItemId: unknown;
  oldPrice: number;
  newPrice: number;
  changedBy: { _id: unknown; name?: string; phone: string } | null;
  reason?: string;
  createdAt: Date;
}

export async function getPriceHistory(itemId: string): Promise<PriceHistoryRow[]> {
  if (!isValidObjectId(itemId)) throw AppError.notFound('Item not found.');
  const rows = await PriceHistory.find({ serviceItemId: itemId })
    .sort({ createdAt: -1 })
    .populate<{ changedBy: { _id: unknown; name?: string; phone: string } | null }>(
      'changedBy',
      'name phone',
    )
    .lean();
  return rows;
}

export async function bulkItemAction(
  actor: Actor,
  input: BulkItemActionInput,
): Promise<{ updated: number }> {
  const result = await ServiceItem.updateMany(
    { _id: { $in: input.itemIds } },
    { $set: { isActive: input.action === 'activate' } },
  );
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: `item.bulk-${input.action}`,
    entityType: 'ServiceItem',
    entityId: 'bulk',
    after: input.itemIds,
  });
  triggerCatalogRevalidation();
  return { updated: result.modifiedCount };
}

export async function bulkChangeCategory(
  actor: Actor,
  input: BulkChangeCategoryInput,
): Promise<{ updated: number }> {
  await assertCategoryExists(input.categoryId);
  const result = await ServiceItem.updateMany(
    { _id: { $in: input.itemIds } },
    { $set: { categoryId: input.categoryId } },
  );
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'item.bulk-change-category',
    entityType: 'ServiceItem',
    entityId: 'bulk',
    after: { itemIds: input.itemIds, categoryId: input.categoryId },
  });
  triggerCatalogRevalidation();
  return { updated: result.modifiedCount };
}

export interface BulkRepriceRow {
  itemId: string;
  name: string;
  oldPrice: number;
  newPrice: number;
}

function computeNewPrice(oldPrice: number, mode: 'percentage' | 'flat', value: number): number {
  const raw = mode === 'percentage' ? Math.round(oldPrice * (1 + value / 100)) : oldPrice + value;
  return Math.max(0, raw);
}

/** Always computes the diff; only writes when `commit` is true — see docs/ADMIN_DASHBOARD.md §5 "previewed before applying". */
export async function bulkReprice(
  actor: Actor,
  input: { itemIds: string[]; mode: 'percentage' | 'flat'; value: number; reason: string },
  commit: boolean,
): Promise<{ rows: BulkRepriceRow[] }> {
  const items = await ServiceItem.find({ _id: { $in: input.itemIds } });
  const rows: BulkRepriceRow[] = items.map((item) => ({
    itemId: String(item._id),
    name: item.name,
    oldPrice: item.price,
    newPrice: computeNewPrice(item.price, input.mode, input.value),
  }));

  if (commit) {
    await Promise.all(
      items.map(async (item, index) => {
        const row = rows[index]!;
        if (row.newPrice === row.oldPrice) return;
        item.price = row.newPrice;
        await item.save();
        await PriceHistory.create({
          serviceItemId: item._id,
          oldPrice: row.oldPrice,
          newPrice: row.newPrice,
          changedBy: actor.id,
          reason: input.reason,
        });
      }),
    );
    await logAudit({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'item.bulk-reprice',
      entityType: 'ServiceItem',
      entityId: 'bulk',
      after: { ...input, rows },
    });
    triggerCatalogRevalidation();
  }

  return { rows };
}

// ---------------------------------------------------------------------------
// Pricing grid
// ---------------------------------------------------------------------------

export async function getPricingGrid(): Promise<ItemLean[]> {
  return ServiceItem.find({}).sort({ sortOrder: 1 }).lean();
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** For 200+ items, a real business wants to edit prices in Excel — see docs/ADMIN_DASHBOARD.md §6. */
export async function getPricingGridCsv(): Promise<string> {
  const items = await ServiceItem.find({})
    .sort({ sortOrder: 1 })
    .populate<{ categoryId: { name: string } }>('categoryId', 'name')
    .lean();

  const header = [
    'itemId',
    'category',
    'name',
    'price',
    'expressPrice',
    'taxRatePercent',
    'isActive',
  ];
  const lines = items.map((item) =>
    [
      String(item._id),
      item.categoryId?.name ?? '',
      item.name,
      String(item.price),
      item.expressPrice != null ? String(item.expressPrice) : '',
      String(item.taxRatePercent),
      String(item.isActive),
    ]
      .map(csvEscape)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

/** One atomic save across every edited row — see docs/ADMIN_DASHBOARD.md §6. */
export async function updatePricingGrid(
  actor: Actor,
  input: PricingGridUpdateInput,
): Promise<ItemLean[]> {
  const session = await mongoose.startSession();
  const updated: ItemLean[] = [];

  try {
    await session.withTransaction(async () => {
      for (const row of input.updates) {
        if (!isValidObjectId(row.itemId))
          throw AppError.badRequest('INVALID_ITEM', 'Invalid item id.');
        const item = await ServiceItem.findById(row.itemId).session(session);
        if (!item) throw AppError.notFound(`Item ${row.itemId} not found.`);

        const oldPrice = item.price;
        if (row.price !== undefined) item.price = row.price;
        if (row.expressPrice !== undefined) item.expressPrice = row.expressPrice;
        if (row.taxRatePercent !== undefined) item.taxRatePercent = row.taxRatePercent;
        if (row.isActive !== undefined) item.isActive = row.isActive;
        await item.save({ session });

        if (row.price !== undefined && row.price !== oldPrice) {
          await PriceHistory.create(
            [
              {
                serviceItemId: item._id,
                oldPrice,
                newPrice: row.price,
                changedBy: actor.id,
                reason: input.reason,
              },
            ],
            { session },
          );
        }
        updated.push(item.toObject());
      }
    });
  } finally {
    await session.endSession();
  }

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'pricing.grid-update',
    entityType: 'ServiceItem',
    entityId: 'bulk',
    after: input,
  });
  triggerCatalogRevalidation();
  return updated;
}

export interface CsvPreviewRow {
  itemId: string;
  name: string;
  valid: boolean;
  error?: string;
  oldPrice?: number;
  newPrice?: number;
}

async function validateCsvRows(rows: CsvImportPreviewInput['rows']): Promise<CsvPreviewRow[]> {
  const itemIds = rows.map((r) => r.itemId).filter((id) => isValidObjectId(id));
  const items = await ServiceItem.find({ _id: { $in: itemIds } }).lean();
  const itemsById = new Map(items.map((item) => [String(item._id), item]));

  return rows.map((row) => {
    if (!isValidObjectId(row.itemId)) {
      return { itemId: row.itemId, name: '(unknown)', valid: false, error: 'Invalid item id' };
    }
    const item = itemsById.get(row.itemId);
    if (!item)
      return { itemId: row.itemId, name: '(unknown)', valid: false, error: 'Item not found' };
    if (row.price !== undefined && row.price < 0) {
      return {
        itemId: row.itemId,
        name: item.name,
        valid: false,
        error: 'Price cannot be negative',
      };
    }
    return {
      itemId: row.itemId,
      name: item.name,
      valid: true,
      oldPrice: item.price,
      newPrice: row.price ?? item.price,
    };
  });
}

export async function previewCsvImport(
  input: CsvImportPreviewInput,
): Promise<{ rows: CsvPreviewRow[] }> {
  return { rows: await validateCsvRows(input.rows) };
}

export async function commitCsvImport(
  actor: Actor,
  input: CsvImportCommitInput,
): Promise<{ updated: number }> {
  const preview = await validateCsvRows(input.rows);
  const invalidRow = preview.find((r) => !r.valid);
  if (invalidRow) {
    throw AppError.badRequest(
      'INVALID_IMPORT',
      `Row for item ${invalidRow.itemId} is invalid: ${invalidRow.error}`,
    );
  }

  const session = await mongoose.startSession();
  let updated = 0;
  try {
    await session.withTransaction(async () => {
      for (const row of input.rows) {
        const item = await ServiceItem.findById(row.itemId).session(session);
        if (!item) continue;
        const oldPrice = item.price;
        if (row.price !== undefined) item.price = row.price;
        if (row.expressPrice !== undefined) item.expressPrice = row.expressPrice;
        if (row.taxRatePercent !== undefined) item.taxRatePercent = row.taxRatePercent;
        await item.save({ session });
        if (row.price !== undefined && row.price !== oldPrice) {
          await PriceHistory.create(
            [
              {
                serviceItemId: item._id,
                oldPrice,
                newPrice: row.price,
                changedBy: actor.id,
                reason: 'CSV import',
              },
            ],
            { session },
          );
        }
        updated += 1;
      }
    });
  } finally {
    await session.endSession();
  }

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'pricing.csv-import',
    entityType: 'ServiceItem',
    entityId: 'bulk',
    after: { rowCount: input.rows.length },
  });
  triggerCatalogRevalidation();
  return { updated };
}
