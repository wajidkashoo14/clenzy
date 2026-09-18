import express, { Router } from 'express';
import * as webhooksController from '../controllers/webhooks.controller.js';

// PUBLIC, signature-verified — see docs/API_SPEC.md §8. Exempt from the global rate limit (webhooks).
export const webhooksRouter = Router();

webhooksRouter.post(
  '/razorpay',
  express.raw({ type: 'application/json' }),
  webhooksController.razorpayWebhook,
);
