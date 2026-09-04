import type { Request } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ordersController from '../controllers/orders.controller.js';
import { requireAuth } from '../middlewares/auth.js';

// 10 / user / hour — see docs/API_SPEC.md §11. Runs after requireAuth, so req.user is set.
const placeOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
});

export const ordersRouter = Router();

ordersRouter.use(requireAuth);
ordersRouter.post('/', placeOrderLimiter, ordersController.place);
ordersRouter.get('/', ordersController.list);
ordersRouter.get('/:orderNumber', ordersController.get);
ordersRouter.get('/:orderNumber/track', ordersController.track);
ordersRouter.post('/:orderNumber/cancel', ordersController.cancel);
ordersRouter.post('/:orderNumber/reschedule', ordersController.reschedule);
ordersRouter.post('/:orderNumber/reclean', ordersController.reclean);
ordersRouter.post('/:orderNumber/approve-revision', ordersController.approveRevision);
