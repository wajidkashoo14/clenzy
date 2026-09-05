import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

/**
 * See docs/API_SPEC.md §10. Only the "Orders (STAFF+)" section exists so
 * far — the rest of the admin surface (dashboard, catalog CRUD, staff,
 * etc.) is a later phase (docs/ADMIN_DASHBOARD.md / Phase 12).
 */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('staff'));

adminRouter.get('/orders', adminController.listOrders);
adminRouter.get('/orders/roster', adminController.roster);
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
