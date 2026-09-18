import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { handleRazorpayWebhook } from '../services/webhooks.service.js';

/** Mounted with `express.raw()`, not `express.json()` — `req.body` is a Buffer here. See app.ts. */
export const razorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const rawBody = (req.body as Buffer).toString('utf8');
  const signatureHeader = req.headers['x-razorpay-signature'];
  const result = await handleRazorpayWebhook(
    rawBody,
    typeof signatureHeader === 'string' ? signatureHeader : undefined,
  );
  // Always 200 once stored, even on downstream processing failure — see docs/API_SPEC.md §8.
  res.status(result.status).json({ received: result.status === 200 });
});
