import { Router } from 'express';
import * as couponsController from '../controllers/coupons.controller.js';
import { requireAuth } from '../middlewares/auth.js';

// AUTH — see docs/API_SPEC.md §6.
export const couponsRouter = Router();

couponsRouter.use(requireAuth);
couponsRouter.post('/validate', couponsController.validate);
