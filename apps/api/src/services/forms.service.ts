import type { B2bEnquiryInput, ContactInput, LeadInput } from '@clenzy/shared';
import { B2bEnquiry } from '../models/B2bEnquiry.js';
import { ContactSubmission } from '../models/ContactSubmission.js';
import { Lead } from '../models/Lead.js';

export async function createLead(input: LeadInput) {
  const lead = await Lead.create({
    name: input.name,
    phone: input.phone,
    email: input.email || undefined,
    area: input.area || undefined,
    pincode: input.pincode || undefined,
    serviceInterest: input.serviceInterest || undefined,
    preferredDate: input.preferredDate || undefined,
    preferredWindow: input.preferredWindow || undefined,
    message: input.message || undefined,
  });
  return lead;
}

export async function createContactSubmission(input: ContactInput) {
  const submission = await ContactSubmission.create({
    name: input.name,
    phone: input.phone,
    email: input.email || undefined,
    message: input.message,
  });
  return submission;
}

export async function createB2bEnquiry(input: B2bEnquiryInput) {
  const enquiry = await B2bEnquiry.create({
    name: input.name,
    businessName: input.businessName,
    businessType: input.businessType,
    phone: input.phone,
    email: input.email,
    message: input.message || undefined,
  });
  return enquiry;
}
