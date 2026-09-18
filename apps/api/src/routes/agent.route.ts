import { Router } from 'express';
import * as agentController from '../controllers/agent.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

/**
 * See docs/API_SPEC.md §10 "Agent endpoints (AGENT)". `:orderId` in the
 * spec's path is used here as the order's human-facing `orderNumber` —
 * consistent with every customer-facing order route, and agents never need
 * to know a raw Mongo id.
 */
export const agentRouter = Router();

agentRouter.use(requireAuth, requireRole('agent'));

agentRouter.get('/tasks', agentController.listTasks);
agentRouter.patch('/tasks/:orderId/picked-up', agentController.pickedUp);
agentRouter.patch('/tasks/:orderId/delivered', agentController.delivered);
agentRouter.patch('/tasks/:orderId/failed', agentController.failed);
