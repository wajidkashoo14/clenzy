import { Router } from 'express';
import * as catalogController from '../controllers/catalog.controller.js';

export const catalogRouter = Router();

catalogRouter.get('/services', catalogController.listCategories);
catalogRouter.get('/services/:slug', catalogController.getCategory);
catalogRouter.get('/items', catalogController.listItems);
catalogRouter.get('/items/:id', catalogController.getItem);
catalogRouter.get('/pricing', catalogController.getPricing);
