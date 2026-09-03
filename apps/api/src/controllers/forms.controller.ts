import { b2bEnquiryInputSchema, contactInputSchema, leadInputSchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import {
  createB2bEnquiry,
  createContactSubmission,
  createLead,
} from '../services/forms.service.js';

export const submitLead = asyncHandler(async (req: Request, res: Response) => {
  const input = leadInputSchema.parse(req.body);

  // Honeypot: real users never fill this field. Report success without
  // writing anything, so bots get no signal their submission was rejected.
  if (input.website) {
    res.status(201).json({ success: true, data: { received: true } });
    return;
  }

  await createLead(input);
  res.status(201).json({ success: true, data: { received: true } });
});

export const submitContact = asyncHandler(async (req: Request, res: Response) => {
  const input = contactInputSchema.parse(req.body);

  if (input.website) {
    res.status(201).json({ success: true, data: { received: true } });
    return;
  }

  await createContactSubmission(input);
  res.status(201).json({ success: true, data: { received: true } });
});

export const submitB2bEnquiry = asyncHandler(async (req: Request, res: Response) => {
  const input = b2bEnquiryInputSchema.parse(req.body);

  if (input.website) {
    res.status(201).json({ success: true, data: { received: true } });
    return;
  }

  await createB2bEnquiry(input);
  res.status(201).json({ success: true, data: { received: true } });
});
