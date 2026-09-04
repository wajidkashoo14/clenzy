import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

/**
 * See docs/API_SPEC.md §10. Only the refund endpoint exists so far — the
 * rest of the admin surface (dashboard, catalog CRUD, staff, etc.) is a
 * later phase (docs/ADMIN_DASHBOARD.md); this one exists now because Phase 8
 * explicitly requires an admin-only refund service.
 */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));
adminRouter.post('/orders/:id/refund', adminController.refundOrder);
