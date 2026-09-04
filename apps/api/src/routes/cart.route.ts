import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';

export const cartRouter = Router();

// PUBLIC — see docs/API_SPEC.md §5. Guests price a cart without an account.
cartRouter.post('/estimate', cartController.estimate);
