import { Router } from 'express';
import * as reviewsController from '../controllers/reviews.controller.js';

export const reviewsRouter = Router();

reviewsRouter.get('/', reviewsController.listReviews);
