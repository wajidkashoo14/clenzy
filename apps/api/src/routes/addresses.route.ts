import { Router } from 'express';
import * as addressesController from '../controllers/addresses.controller.js';
import { requireAuth } from '../middlewares/auth.js';

// All routes AUTH — see docs/API_SPEC.md §2. Ownership is enforced in the service layer.
export const addressesRouter = Router();

addressesRouter.use(requireAuth);
addressesRouter.get('/', addressesController.list);
addressesRouter.post('/', addressesController.create);
addressesRouter.get('/:id', addressesController.get);
addressesRouter.patch('/:id', addressesController.update);
addressesRouter.delete('/:id', addressesController.remove);
addressesRouter.post('/:id/default', addressesController.setDefault);
