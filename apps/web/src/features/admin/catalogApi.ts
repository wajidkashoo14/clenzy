import type {
  BulkChangeCategoryInput,
  BulkItemActionInput,
  BulkPriceUpdateInput,
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
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type {
  AdminCategory,
  AdminItem,
  AdminPriceHistoryRow,
  BulkRepriceRow,
  CsvPreviewRow,
} from './catalogTypes';

export function listCategories(): Promise<{ categories: AdminCategory[] }> {
  return apiGet('/api/v1/admin/services');
}
export function createCategory(input: CreateCategoryInput): Promise<{ category: AdminCategory }> {
  return apiPost('/api/v1/admin/services', input);
}
export function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<{ category: AdminCategory }> {
  return apiPatch(`/api/v1/admin/services/${id}`, input);
}
export function reorderCategories(input: ReorderCategoriesInput): Promise<{ reordered: true }> {
  return apiPost('/api/v1/admin/services/reorder', input);
}
export function deactivateCategory(
  id: string,
  force = false,
): Promise<{ category: AdminCategory; orphanedItemCount: number }> {
  return apiDelete(`/api/v1/admin/services/${id}${force ? '?force=true' : ''}`);
}

export function listItems(
  query: ItemListQuery,
): Promise<{ items: AdminItem[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams();
  if (query.categoryId) params.set('categoryId', query.categoryId);
  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  return apiGet(`/api/v1/admin/items?${params.toString()}`);
}
export function createItem(input: CreateItemInput): Promise<{ item: AdminItem }> {
  return apiPost('/api/v1/admin/items', input);
}
export function updateItem(id: string, input: UpdateItemInput): Promise<{ item: AdminItem }> {
  return apiPatch(`/api/v1/admin/items/${id}`, input);
}
export function deactivateItem(id: string): Promise<{ item: AdminItem }> {
  return apiDelete(`/api/v1/admin/items/${id}`);
}
export function getPriceHistory(id: string): Promise<{ history: AdminPriceHistoryRow[] }> {
  return apiGet(`/api/v1/admin/items/${id}/price-history`);
}
export function bulkItemAction(input: BulkItemActionInput): Promise<{ updated: number }> {
  return apiPatch('/api/v1/admin/items/bulk-status', input);
}
export function bulkChangeCategory(input: BulkChangeCategoryInput): Promise<{ updated: number }> {
  return apiPatch('/api/v1/admin/items/bulk-category', input);
}
export function bulkRepricePreview(
  input: BulkPriceUpdateInput,
): Promise<{ rows: BulkRepriceRow[] }> {
  return apiPost('/api/v1/admin/items/bulk-reprice/preview', input);
}
export function bulkRepriceCommit(
  input: BulkPriceUpdateInput,
): Promise<{ rows: BulkRepriceRow[] }> {
  return apiPost('/api/v1/admin/items/bulk-reprice/commit', input);
}

export function getPricingGrid(): Promise<{ items: AdminItem[] }> {
  return apiGet('/api/v1/admin/pricing');
}
export function updatePricingGrid(input: PricingGridUpdateInput): Promise<{ items: AdminItem[] }> {
  return apiPatch('/api/v1/admin/items/bulk-price', input);
}
export function previewCsvImport(input: CsvImportPreviewInput): Promise<{ rows: CsvPreviewRow[] }> {
  return apiPost('/api/v1/admin/pricing/import/preview', input);
}
export function commitCsvImport(input: CsvImportCommitInput): Promise<{ updated: number }> {
  return apiPost('/api/v1/admin/pricing/import/commit', input);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/** CSV is a binary-ish text download, not JSON — fetched directly rather than through apiGet. */
export async function downloadPricingCsv(): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/admin/pricing/export.csv`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Could not download the pricing CSV.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pricing.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
