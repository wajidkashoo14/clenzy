import { Router } from 'express';
import * as adminCatalogController from '../controllers/adminCatalog.controller.js';
import * as adminController from '../controllers/admin.controller.js';
import * as adminAreasController from '../controllers/adminAreas.controller.js';
import * as adminCouponsController from '../controllers/adminCoupons.controller.js';
import * as adminSlotsController from '../controllers/adminSlots.controller.js';
import * as adminStaffController from '../controllers/adminStaff.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

/**
 * See docs/API_SPEC.md §10 and docs/ADMIN_DASHBOARD.md. Phase 12a covered
 * dashboard + order operations; Phase 12b adds catalog/pricing/coupons/
 * areas/slots/staff. Content/reports (Phase 12c) remain a later phase.
 *
 * Role bar: API_SPEC.md §10's header is "ADMIN unless noted" — the STAFF+
 * baseline below is the "Orders (STAFF+)" exception from 12a. Everything
 * added in 12b keeps reads at that same STAFF+ baseline (staff need to see
 * the catalog/pricing/coupons to help customers) but gates mutations to
 * `requireRole('admin')`, matching the spec's default for money-adjacent
 * actions.
 */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('staff'));
const requireAdmin = requireRole('admin');

adminRouter.get('/dashboard', adminController.getDashboard);
adminRouter.get('/agents', adminController.listAgents);

adminRouter.get('/orders', adminController.listOrders);
adminRouter.post('/orders', adminController.createOrder);
adminRouter.get('/orders/roster', adminController.roster);
adminRouter.post('/orders/roster/assign', adminController.bulkAssignRoster);
adminRouter.get('/orders/:id', adminController.getOrder);
adminRouter.patch('/orders/:id/status', adminController.updateStatus);
adminRouter.patch('/orders/:id/items', adminController.reviseItems);
adminRouter.patch('/orders/:id/assign', adminController.assign);
adminRouter.patch('/orders/:id/slots', adminController.reschedule);
adminRouter.post('/orders/:id/notes', adminController.addNote);
adminRouter.post('/orders/:id/cancel', adminController.cancelOrder);
// ADMIN only — see docs/API_SPEC.md §10's explicit note on the refund endpoint.
adminRouter.post('/orders/:id/refund', requireRole('admin'), adminController.refundOrder);

// ADMIN only — controls real SMS/email spend, same bar as the refund endpoint.
adminRouter.get(
  '/notifications/settings',
  requireRole('admin'),
  adminController.getNotificationSettings,
);
adminRouter.patch(
  '/notifications/settings',
  requireRole('admin'),
  adminController.updateNotificationSettings,
);

// --- Categories ---------------------------------------------------------
adminRouter.get('/services', adminCatalogController.listCategories);
adminRouter.post('/services', requireAdmin, adminCatalogController.createCategory);
adminRouter.post('/services/reorder', requireAdmin, adminCatalogController.reorderCategories);
adminRouter.patch('/services/:id', requireAdmin, adminCatalogController.updateCategory);
adminRouter.delete('/services/:id', requireAdmin, adminCatalogController.deactivateCategory);

// --- Items ---------------------------------------------------------------
// Static /items/bulk-* and /items/:id/price-history routes must precede the
// generic /items/:id routes below, or Express would match "bulk-status" etc.
// as an :id value.
adminRouter.get('/items', adminCatalogController.listItems);
adminRouter.post('/items', requireAdmin, adminCatalogController.createItem);
adminRouter.patch('/items/bulk-status', requireAdmin, adminCatalogController.bulkItemAction);
adminRouter.patch('/items/bulk-category', requireAdmin, adminCatalogController.bulkChangeCategory);
adminRouter.post(
  '/items/bulk-reprice/preview',
  requireAdmin,
  adminCatalogController.bulkRepricePreview,
);
adminRouter.post(
  '/items/bulk-reprice/commit',
  requireAdmin,
  adminCatalogController.bulkRepriceCommit,
);
adminRouter.patch('/items/bulk-price', requireAdmin, adminCatalogController.updatePricingGrid);
adminRouter.get('/items/:id/price-history', adminCatalogController.getPriceHistory);
adminRouter.patch('/items/:id', requireAdmin, adminCatalogController.updateItem);
adminRouter.delete('/items/:id', requireAdmin, adminCatalogController.deactivateItem);

// --- Pricing grid ----------------------------------------------------------
adminRouter.get('/pricing', adminCatalogController.getPricingGrid);
adminRouter.get('/pricing/export.csv', adminCatalogController.exportPricingCsv);
adminRouter.post('/pricing/import/preview', requireAdmin, adminCatalogController.previewCsvImport);
adminRouter.post('/pricing/import/commit', requireAdmin, adminCatalogController.commitCsvImport);

// --- Coupons ---------------------------------------------------------------
adminRouter.get('/coupons', adminCouponsController.listCoupons);
adminRouter.post('/coupons', requireAdmin, adminCouponsController.createCoupon);
adminRouter.get('/coupons/:id', adminCouponsController.getCoupon);
adminRouter.patch('/coupons/:id', requireAdmin, adminCouponsController.updateCoupon);
adminRouter.delete('/coupons/:id', requireAdmin, adminCouponsController.deactivateCoupon);
adminRouter.get('/coupons/:id/redemptions', adminCouponsController.getCouponRedemptions);

// --- Service areas -----------------------------------------------------------
adminRouter.get('/areas', adminAreasController.listAreas);
adminRouter.post('/areas', requireAdmin, adminAreasController.createArea);
adminRouter.get('/areas/:id', adminAreasController.getArea);
adminRouter.patch('/areas/:id', requireAdmin, adminAreasController.updateArea);
adminRouter.patch(
  '/areas/:id/availability',
  requireAdmin,
  adminAreasController.setAreaAvailability,
);
adminRouter.delete('/areas/:id', requireAdmin, adminAreasController.deactivateArea);

// --- Slots -------------------------------------------------------------------
adminRouter.get('/slots/templates', adminSlotsController.listSlotTemplates);
adminRouter.post('/slots/templates', requireAdmin, adminSlotsController.createSlotTemplate);
adminRouter.patch('/slots/templates/:id', requireAdmin, adminSlotsController.updateSlotTemplate);
adminRouter.delete(
  '/slots/templates/:id',
  requireAdmin,
  adminSlotsController.deactivateSlotTemplate,
);
adminRouter.get('/slots/capacity', adminSlotsController.getSlotCapacity);
adminRouter.patch('/slots/capacity', requireAdmin, adminSlotsController.overrideSlotCapacity);

// --- Staff ---------------------------------------------------------------
adminRouter.get('/staff', adminStaffController.listAgents);
adminRouter.post('/staff', requireAdmin, adminStaffController.createAgent);
adminRouter.patch('/staff/:id', requireAdmin, adminStaffController.updateAgent);
// SUPERADMIN only — see docs/API_SPEC.md §10 and docs/ADMIN_DASHBOARD.md §10.
adminRouter.patch(
  '/users/:id/role',
  requireRole('superadmin'),
  adminStaffController.changeUserRole,
);
