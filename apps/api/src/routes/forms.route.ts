import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitB2bEnquiry, submitContact, submitLead } from '../controllers/forms.controller.js';

/**
 * 5/hour/IP, shared across all three public lead-capture forms (one
 * middleware instance reused below, not one per route) — see
 * docs/API_SPEC.md §11. Deliberate: a per-endpoint budget would let a
 * spammer get 15 submissions/hour by round-robining leads/contact/b2b.
 */
const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

export const formsRouter = Router();

formsRouter.post('/leads', publicFormLimiter, submitLead);
formsRouter.post('/contact', publicFormLimiter, submitContact);
formsRouter.post('/b2b-enquiries', publicFormLimiter, submitB2bEnquiry);
