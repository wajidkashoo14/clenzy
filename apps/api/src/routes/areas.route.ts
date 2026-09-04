import { Router } from 'express';
import * as areasController from '../controllers/areas.controller.js';

export const areasRouter = Router();

// /check must be registered before any future /:slug route to avoid "check" being read as a slug.
areasRouter.get('/check', areasController.checkPincode);
areasRouter.get('/', areasController.listAreas);
