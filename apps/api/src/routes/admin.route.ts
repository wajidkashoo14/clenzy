import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

/**
 * See docs/API_SPEC.md §10 and docs/ADMIN_DASHBOARD.md (Phase 12a: dashboard
 * + order operations). Catalog CRUD, staff management, content/reports
 * (Phase 12b/12c) are later phases.
 */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('staff'));

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
