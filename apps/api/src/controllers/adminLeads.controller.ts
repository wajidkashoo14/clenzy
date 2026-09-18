import {
  addPipelineNoteInputSchema,
  convertLeadInputSchema,
  pipelineListQuerySchema,
  updateLeadInputSchema,
  updateSubmissionStatusInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import * as adminLeadsService from '../services/adminLeads.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}
function actorOf(req: Request) {
  return { id: req.user!.id, role: req.user!.role };
}

// --- Leads -------------------------------------------------------------------

export const listLeads = asyncHandler(async (req: Request, res: Response) => {
  const query = pipelineListQuerySchema.parse(req.query);
  const result = await adminLeadsService.listLeadsAdmin(query);
  res.status(200).json({ success: true, data: result });
});

export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  const input = updateLeadInputSchema.parse(req.body);
  const lead = await adminLeadsService.updateLead(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { lead } });
});

export const addLeadNote = asyncHandler(async (req: Request, res: Response) => {
  const input = addPipelineNoteInputSchema.parse(req.body);
  const lead = await adminLeadsService.addLeadNote(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { lead } });
});

export const convertLead = asyncHandler(async (req: Request, res: Response) => {
  const input = convertLeadInputSchema.parse(req.body);
  const lead = await adminLeadsService.convertLead(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input.orderId,
  );
  res.status(200).json({ success: true, data: { lead } });
});

// --- Contact submissions -------------------------------------------------------

export const listContactSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const query = pipelineListQuerySchema.parse(req.query);
  const result = await adminLeadsService.listContactSubmissionsAdmin(query);
  res.status(200).json({ success: true, data: result });
});

export const updateContactSubmissionStatus = asyncHandler(async (req: Request, res: Response) => {
  const input = updateSubmissionStatusInputSchema.parse(req.body);
  const submission = await adminLeadsService.updateContactSubmissionStatus(
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { submission } });
});

export const addContactSubmissionNote = asyncHandler(async (req: Request, res: Response) => {
  const input = addPipelineNoteInputSchema.parse(req.body);
  const submission = await adminLeadsService.addContactSubmissionNote(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { submission } });
});

// --- B2B enquiries -------------------------------------------------------------

export const listB2bEnquiries = asyncHandler(async (req: Request, res: Response) => {
  const query = pipelineListQuerySchema.parse(req.query);
  const result = await adminLeadsService.listB2bEnquiriesAdmin(query);
  res.status(200).json({ success: true, data: result });
});

export const updateB2bEnquiryStatus = asyncHandler(async (req: Request, res: Response) => {
  const input = updateSubmissionStatusInputSchema.parse(req.body);
  const enquiry = await adminLeadsService.updateB2bEnquiryStatus(
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { enquiry } });
});

export const addB2bEnquiryNote = asyncHandler(async (req: Request, res: Response) => {
  const input = addPipelineNoteInputSchema.parse(req.body);
  const enquiry = await adminLeadsService.addB2bEnquiryNote(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { enquiry } });
});
