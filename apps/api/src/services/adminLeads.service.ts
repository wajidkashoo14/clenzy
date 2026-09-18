import type {
  AddPipelineNoteInput,
  PipelineListQuery,
  UpdateLeadInput,
  UpdateSubmissionStatusInput,
} from '@clenzy/shared';
import { isValidObjectId, Types } from 'mongoose';
import { B2bEnquiry, type B2bEnquiryDocument } from '../models/B2bEnquiry.js';
import { ContactSubmission, type ContactSubmissionDocument } from '../models/ContactSubmission.js';
import { Lead, type LeadDocument } from '../models/Lead.js';
import { logAudit } from './auditLog.service.js';
import { AppError } from '../utils/AppError.js';

interface Actor {
  id: string;
  role: string;
}

export interface PipelineListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

function pipelineFilter(status: PipelineListQuery['status']): Record<string, unknown> {
  return status === 'all' ? {} : { status };
}

// ---------------------------------------------------------------------------
// Leads (full pipeline: status, assignment, conversion)
// ---------------------------------------------------------------------------

export async function listLeadsAdmin(
  query: PipelineListQuery,
): Promise<PipelineListResult<LeadDocument>> {
  const filter = pipelineFilter(query.status);
  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.pageSize).lean(),
    Lead.countDocuments(filter),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function updateLead(
  actor: Actor,
  id: string,
  input: UpdateLeadInput,
): Promise<LeadDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('Lead not found.');
  const lead = await Lead.findById(id);
  if (!lead) throw AppError.notFound('Lead not found.');

  const before = lead.toObject();
  if (input.status) lead.status = input.status;
  if (input.assignedTo) lead.assignedTo = new Types.ObjectId(input.assignedTo);
  await lead.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'lead.update',
    entityType: 'Lead',
    entityId: id,
    before,
    after: lead.toObject(),
  });
  return lead.toObject();
}

export async function addLeadNote(
  actor: Actor,
  id: string,
  input: AddPipelineNoteInput,
): Promise<LeadDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('Lead not found.');
  const lead = await Lead.findById(id);
  if (!lead) throw AppError.notFound('Lead not found.');

  lead.notes.push({ note: input.note, by: new Types.ObjectId(actor.id), at: new Date() });
  await lead.save();
  return lead.toObject();
}

/**
 * Marks the lead converted and links the order created on its behalf — see
 * docs/ADMIN_DASHBOARD.md §11's "convert to order" action. The manual-order
 * modal (already built in Phase 12a) pre-fills from the lead's fields on the
 * frontend; this just records the outcome once that order exists.
 */
export async function convertLead(
  actor: Actor,
  id: string,
  orderId: string,
): Promise<LeadDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('Lead not found.');
  const lead = await Lead.findById(id);
  if (!lead) throw AppError.notFound('Lead not found.');

  const before = lead.toObject();
  lead.status = 'converted';
  lead.convertedOrderId = new Types.ObjectId(orderId);
  await lead.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'lead.convert',
    entityType: 'Lead',
    entityId: id,
    before,
    after: lead.toObject(),
  });
  return lead.toObject();
}

// ---------------------------------------------------------------------------
// Contact submissions & B2B enquiries — "equivalent, simpler queues" per
// docs/ADMIN_DASHBOARD.md §11: status + notes only, no assignment/conversion.
// ---------------------------------------------------------------------------

export async function listContactSubmissionsAdmin(
  query: PipelineListQuery,
): Promise<PipelineListResult<ContactSubmissionDocument>> {
  const filter = pipelineFilter(query.status);
  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    ContactSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.pageSize).lean(),
    ContactSubmission.countDocuments(filter),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function updateContactSubmissionStatus(
  id: string,
  input: UpdateSubmissionStatusInput,
): Promise<ContactSubmissionDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('Submission not found.');
  const submission = await ContactSubmission.findByIdAndUpdate(
    id,
    { $set: { status: input.status } },
    { new: true },
  ).lean();
  if (!submission) throw AppError.notFound('Submission not found.');
  return submission;
}

export async function addContactSubmissionNote(
  actor: Actor,
  id: string,
  input: AddPipelineNoteInput,
): Promise<ContactSubmissionDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('Submission not found.');
  const submission = await ContactSubmission.findById(id);
  if (!submission) throw AppError.notFound('Submission not found.');
  submission.notes.push({ note: input.note, by: new Types.ObjectId(actor.id), at: new Date() });
  await submission.save();
  return submission.toObject();
}

export async function listB2bEnquiriesAdmin(
  query: PipelineListQuery,
): Promise<PipelineListResult<B2bEnquiryDocument>> {
  const filter = pipelineFilter(query.status);
  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    B2bEnquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.pageSize).lean(),
    B2bEnquiry.countDocuments(filter),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function updateB2bEnquiryStatus(
  id: string,
  input: UpdateSubmissionStatusInput,
): Promise<B2bEnquiryDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('Enquiry not found.');
  const enquiry = await B2bEnquiry.findByIdAndUpdate(
    id,
    { $set: { status: input.status } },
    { new: true },
  ).lean();
  if (!enquiry) throw AppError.notFound('Enquiry not found.');
  return enquiry;
}

export async function addB2bEnquiryNote(
  actor: Actor,
  id: string,
  input: AddPipelineNoteInput,
): Promise<B2bEnquiryDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('Enquiry not found.');
  const enquiry = await B2bEnquiry.findById(id);
  if (!enquiry) throw AppError.notFound('Enquiry not found.');
  enquiry.notes.push({ note: input.note, by: new Types.ObjectId(actor.id), at: new Date() });
  await enquiry.save();
  return enquiry.toObject();
}
