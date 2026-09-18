import {
  bulkChangeCategoryInputSchema,
  bulkItemActionInputSchema,
  bulkPriceUpdateInputSchema,
  createCategoryInputSchema,
  createItemInputSchema,
  csvImportCommitInputSchema,
  csvImportPreviewInputSchema,
  itemListQuerySchema,
  pricingGridUpdateInputSchema,
  reorderCategoriesInputSchema,
  updateCategoryInputSchema,
  updateItemInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import * as adminCatalogService from '../services/adminCatalog.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}
function actorOf(req: Request) {
  return { id: req.user!.id, role: req.user!.role };
}

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await adminCatalogService.listCategoriesAdmin();
  res.status(200).json({ success: true, data: { categories } });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const input = createCategoryInputSchema.parse(req.body);
  const category = await adminCatalogService.createCategory(actorOf(req), input);
  res.status(201).json({ success: true, data: { category } });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const input = updateCategoryInputSchema.parse(req.body);
  const category = await adminCatalogService.updateCategory(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { category } });
});

export const reorderCategories = asyncHandler(async (req: Request, res: Response) => {
  const input = reorderCategoriesInputSchema.parse(req.body);
  await adminCatalogService.reorderCategories(actorOf(req), input);
  res.status(200).json({ success: true, data: { reordered: true } });
});

export const deactivateCategory = asyncHandler(async (req: Request, res: Response) => {
  const force = req.query.force === 'true';
  const result = await adminCatalogService.deactivateCategory(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    force,
  );
  res.status(200).json({ success: true, data: result });
});

export const listItems = asyncHandler(async (req: Request, res: Response) => {
  const query = itemListQuerySchema.parse(req.query);
  const result = await adminCatalogService.listItemsAdmin(query);
  res.status(200).json({ success: true, data: result });
});

export const createItem = asyncHandler(async (req: Request, res: Response) => {
  const input = createItemInputSchema.parse(req.body);
  const item = await adminCatalogService.createItem(actorOf(req), input);
  res.status(201).json({ success: true, data: { item } });
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const input = updateItemInputSchema.parse(req.body);
  const item = await adminCatalogService.updateItem(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { item } });
});

export const deactivateItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await adminCatalogService.deactivateItem(
    actorOf(req),
    requireParam(req.params.id, 'id'),
  );
  res.status(200).json({ success: true, data: { item } });
});

export const getPriceHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await adminCatalogService.getPriceHistory(requireParam(req.params.id, 'id'));
  res.status(200).json({ success: true, data: { history } });
});

export const bulkItemAction = asyncHandler(async (req: Request, res: Response) => {
  const input = bulkItemActionInputSchema.parse(req.body);
  const result = await adminCatalogService.bulkItemAction(actorOf(req), input);
  res.status(200).json({ success: true, data: result });
});

export const bulkChangeCategory = asyncHandler(async (req: Request, res: Response) => {
  const input = bulkChangeCategoryInputSchema.parse(req.body);
  const result = await adminCatalogService.bulkChangeCategory(actorOf(req), input);
  res.status(200).json({ success: true, data: result });
});

export const bulkRepricePreview = asyncHandler(async (req: Request, res: Response) => {
  const input = bulkPriceUpdateInputSchema.parse(req.body);
  const result = await adminCatalogService.bulkReprice(actorOf(req), input, false);
  res.status(200).json({ success: true, data: result });
});

export const bulkRepriceCommit = asyncHandler(async (req: Request, res: Response) => {
  const input = bulkPriceUpdateInputSchema.parse(req.body);
  const result = await adminCatalogService.bulkReprice(actorOf(req), input, true);
  res.status(200).json({ success: true, data: result });
});

export const getPricingGrid = asyncHandler(async (_req: Request, res: Response) => {
  const items = await adminCatalogService.getPricingGrid();
  res.status(200).json({ success: true, data: { items } });
});

export const exportPricingCsv = asyncHandler(async (_req: Request, res: Response) => {
  const csv = await adminCatalogService.getPricingGridCsv();
  res.status(200);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="pricing.csv"');
  res.send(csv);
});

export const updatePricingGrid = asyncHandler(async (req: Request, res: Response) => {
  const input = pricingGridUpdateInputSchema.parse(req.body);
  const items = await adminCatalogService.updatePricingGrid(actorOf(req), input);
  res.status(200).json({ success: true, data: { items } });
});

export const previewCsvImport = asyncHandler(async (req: Request, res: Response) => {
  const input = csvImportPreviewInputSchema.parse(req.body);
  const result = await adminCatalogService.previewCsvImport(input);
  res.status(200).json({ success: true, data: result });
});

export const commitCsvImport = asyncHandler(async (req: Request, res: Response) => {
  const input = csvImportCommitInputSchema.parse(req.body);
  const result = await adminCatalogService.commitCsvImport(actorOf(req), input);
  res.status(200).json({ success: true, data: result });
});
