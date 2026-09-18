import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller.js';
import { requireAuth } from '../middlewares/auth.js';

// AUTH — see docs/API_SPEC.md §8. The webhook route is separate (public, signed) — see webhooks.route.ts.
export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);
paymentsRouter.post('/verify', paymentsController.verify);
paymentsRouter.get('/status/:orderNumber', paymentsController.status);
paymentsRouter.post('/retry/:orderNumber', paymentsController.retry);
