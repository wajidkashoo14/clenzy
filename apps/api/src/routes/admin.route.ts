import { Router } from 'express';
import * as adminAuditLogController from '../controllers/adminAuditLog.controller.js';
import * as adminCatalogController from '../controllers/adminCatalog.controller.js';
import * as adminController from '../controllers/admin.controller.js';
import * as adminAreasController from '../controllers/adminAreas.controller.js';
import * as adminContentController from '../controllers/adminContent.controller.js';
import * as adminCouponsController from '../controllers/adminCoupons.controller.js';
import * as adminLeadsController from '../controllers/adminLeads.controller.js';
import * as adminReportsController from '../controllers/adminReports.controller.js';
import * as adminReviewsController from '../controllers/adminReviews.controller.js';
import * as adminSettingsController from '../controllers/adminSettings.controller.js';
import * as adminSlotsController from '../controllers/adminSlots.controller.js';
import * as adminStaffController from '../controllers/adminStaff.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

/**
 * See docs/API_SPEC.md §10 and docs/ADMIN_DASHBOARD.md. Phase 12a covered
 * dashboard + order operations; Phase 12b added catalog/pricing/coupons/
 * areas/slots/staff; Phase 12c (below) adds reviews/leads/content/
 * settings/reports/audit-logs.
 *
 * Role bar: API_SPEC.md §10's header is "ADMIN unless noted" — the STAFF+
 * baseline below is the "Orders (STAFF+)" exception from 12a. Everything
 * added in 12b/12c keeps reads at that same STAFF+ baseline (staff need to
 * see this data to help customers) but gates mutations to
 * `requireRole('admin')`, matching the spec's default for money-adjacent
 * actions. Settings and audit logs are the exceptions — see their sections
 * below for the stricter bar the spec calls for.
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

// --- Reviews ---------------------------------------------------------------
adminRouter.get('/reviews', adminReviewsController.listReviews);
adminRouter.patch('/reviews/:id', requireAdmin, adminReviewsController.moderateReview);

// --- Leads -------------------------------------------------------------------
adminRouter.get('/leads', adminLeadsController.listLeads);
adminRouter.patch('/leads/:id', requireAdmin, adminLeadsController.updateLead);
adminRouter.post('/leads/:id/notes', requireAdmin, adminLeadsController.addLeadNote);
adminRouter.post('/leads/:id/convert', requireAdmin, adminLeadsController.convertLead);

// --- Contact submissions & B2B enquiries — "equivalent, simpler queues" ----
adminRouter.get('/contact-submissions', adminLeadsController.listContactSubmissions);
adminRouter.patch(
  '/contact-submissions/:id',
  requireAdmin,
  adminLeadsController.updateContactSubmissionStatus,
);
adminRouter.post(
  '/contact-submissions/:id/notes',
  requireAdmin,
  adminLeadsController.addContactSubmissionNote,
);
adminRouter.get('/b2b-enquiries', adminLeadsController.listB2bEnquiries);
adminRouter.patch('/b2b-enquiries/:id', requireAdmin, adminLeadsController.updateB2bEnquiryStatus);
adminRouter.post('/b2b-enquiries/:id/notes', requireAdmin, adminLeadsController.addB2bEnquiryNote);

// --- Content (FAQs, testimonials, banners) — built in, not a headless CMS,
// per docs/ADMIN_DASHBOARD.md §12. ------------------------------------------
adminRouter.get('/content/faqs', adminContentController.listFaqs);
adminRouter.post('/content/faqs', requireAdmin, adminContentController.createFaq);
adminRouter.post('/content/faqs/reorder', requireAdmin, adminContentController.reorderFaqs);
adminRouter.patch('/content/faqs/:id', requireAdmin, adminContentController.updateFaq);
adminRouter.delete('/content/faqs/:id', requireAdmin, adminContentController.deactivateFaq);

adminRouter.get('/content/testimonials', adminContentController.listTestimonials);
adminRouter.post('/content/testimonials', requireAdmin, adminContentController.createTestimonial);
adminRouter.patch(
  '/content/testimonials/:id',
  requireAdmin,
  adminContentController.updateTestimonial,
);
adminRouter.delete(
  '/content/testimonials/:id',
  requireAdmin,
  adminContentController.deactivateTestimonial,
);

adminRouter.get('/content/banners', adminContentController.listBanners);
adminRouter.post('/content/banners', requireAdmin, adminContentController.createBanner);
adminRouter.patch('/content/banners/:id', requireAdmin, adminContentController.updateBanner);
adminRouter.delete('/content/banners/:id', requireAdmin, adminContentController.deactivateBanner);

// --- Settings — ADMIN for both read and write per docs/API_SPEC.md §10's
// explicit bold callout (stricter than this router's STAFF+ baseline). ------
adminRouter.get('/settings', requireAdmin, adminSettingsController.getSettingsHandler);
adminRouter.patch('/settings', requireAdmin, adminSettingsController.updateSettingsHandler);

// --- Reports -----------------------------------------------------------------
adminRouter.get('/reports/revenue', requireAdmin, adminReportsController.getRevenueReport);
adminRouter.get(
  '/reports/revenue.csv',
  requireAdmin,
  adminReportsController.exportRevenueReportCsv,
);
adminRouter.get('/reports/orders', requireAdmin, adminReportsController.getOrdersReport);
adminRouter.get('/reports/orders.csv', requireAdmin, adminReportsController.exportOrdersReportCsv);
adminRouter.get('/reports/customers', requireAdmin, adminReportsController.getCustomersReport);
adminRouter.get(
  '/reports/customers.csv',
  requireAdmin,
  adminReportsController.exportCustomersReportCsv,
);
adminRouter.get('/reports/operations', requireAdmin, adminReportsController.getOperationsReport);
adminRouter.get(
  '/reports/operations.csv',
  requireAdmin,
  adminReportsController.exportOperationsReportCsv,
);
adminRouter.get('/reports/coupons', requireAdmin, adminReportsController.getCouponsReport);
adminRouter.get(
  '/reports/coupons.csv',
  requireAdmin,
  adminReportsController.exportCouponsReportCsv,
);

// --- Audit log viewer — SUPERADMIN only per docs/API_SPEC.md §10. -----------
adminRouter.get('/audit-logs', requireRole('superadmin'), adminAuditLogController.getAuditLogs);
