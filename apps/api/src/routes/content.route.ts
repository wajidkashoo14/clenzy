import { Router } from 'express';
import * as contentController from '../controllers/content.controller.js';

export const contentRouter = Router();

contentRouter.get('/faqs', contentController.listFaqs);
contentRouter.get('/testimonials', contentController.listTestimonials);
contentRouter.get('/banners', contentController.listBanners);
contentRouter.get('/settings/public', contentController.getPublicSettingsHandler);
