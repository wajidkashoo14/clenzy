import { Router } from 'express';
import * as devController from '../controllers/dev.controller.js';
import { requireAuth } from '../middlewares/auth.js';

/** Dev-only payment simulator — see services/devPaymentSimulator.service.ts for the availability guard. */
export const devRouter = Router();

devRouter.use(requireAuth);
devRouter.post('/simulate-payment', devController.simulatePayment);
