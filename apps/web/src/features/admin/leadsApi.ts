import type {
  AddPipelineNoteInput,
  UpdateLeadInput,
  UpdateSubmissionStatusInput,
} from '@clenzy/shared';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';

export interface PipelineNote {
  note: string;
  by?: string;
  at: string;
}

export interface AdminLead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  area?: string;
  pincode?: string;
  serviceInterest?: string;
  preferredDate?: string;
  preferredWindow?: string;
  message?: string;
  source: string;
  status: 'new' | 'contacted' | 'converted' | 'lost';
  assignedTo?: string;
  convertedOrderId?: string;
  notes: PipelineNote[];
  createdAt: string;
}

export interface AdminSubmission {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  status: 'new' | 'contacted' | 'converted' | 'lost';
  notes: PipelineNote[];
  createdAt: string;
}

export interface AdminB2bEnquiry extends AdminSubmission {
  businessName: string;
  businessType?: string;
}

interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

function statusQuery(status?: string): string {
  return status ? `?status=${status}` : '';
}

// --- Leads -------------------------------------------------------------------
export function listLeads(status?: string): Promise<ListResult<AdminLead>> {
  return apiGet(`/api/v1/admin/leads${statusQuery(status)}`);
}
export function updateLead(id: string, input: UpdateLeadInput): Promise<{ lead: AdminLead }> {
  return apiPatch(`/api/v1/admin/leads/${id}`, input);
}
export function addLeadNote(id: string, input: AddPipelineNoteInput): Promise<{ lead: AdminLead }> {
  return apiPost(`/api/v1/admin/leads/${id}/notes`, input);
}
export function convertLead(id: string, orderId: string): Promise<{ lead: AdminLead }> {
  return apiPost(`/api/v1/admin/leads/${id}/convert`, { orderId });
}

// --- Contact submissions -------------------------------------------------------
export function listContactSubmissions(status?: string): Promise<ListResult<AdminSubmission>> {
  return apiGet(`/api/v1/admin/contact-submissions${statusQuery(status)}`);
}
export function updateContactSubmissionStatus(
  id: string,
  input: UpdateSubmissionStatusInput,
): Promise<{ submission: AdminSubmission }> {
  return apiPatch(`/api/v1/admin/contact-submissions/${id}`, input);
}
export function addContactSubmissionNote(
  id: string,
  input: AddPipelineNoteInput,
): Promise<{ submission: AdminSubmission }> {
  return apiPost(`/api/v1/admin/contact-submissions/${id}/notes`, input);
}

// --- B2B enquiries -------------------------------------------------------------
export function listB2bEnquiries(status?: string): Promise<ListResult<AdminB2bEnquiry>> {
  return apiGet(`/api/v1/admin/b2b-enquiries${statusQuery(status)}`);
}
export function updateB2bEnquiryStatus(
  id: string,
  input: UpdateSubmissionStatusInput,
): Promise<{ enquiry: AdminB2bEnquiry }> {
  return apiPatch(`/api/v1/admin/b2b-enquiries/${id}`, input);
}
export function addB2bEnquiryNote(
  id: string,
  input: AddPipelineNoteInput,
): Promise<{ enquiry: AdminB2bEnquiry }> {
  return apiPost(`/api/v1/admin/b2b-enquiries/${id}/notes`, input);
}
