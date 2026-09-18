import { z } from 'zod';

/** Shared validation for the three public lead-capture forms — see docs/API_SPEC.md §9. */

const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Enter a valid phone number')
  .max(15)
  .regex(/^[+\d][\d\s-]{9,14}$/, 'Enter a valid phone number');

const nameSchema = z.string().trim().min(2, 'Enter your name').max(100);
const messageSchema = z.string().trim().max(1000).optional();
/**
 * Honeypot — real users never fill this in; bots usually do. Deliberately
 * NOT restricted to an empty string here: the whole point of a honeypot is
 * that a filled-in value gets silently accepted (see the controllers'
 * `if (input.website)` check) rather than rejected with a validation error,
 * which would tip the bot off that its submission was detected.
 */
const honeypotSchema = z.string().max(200).optional().or(z.literal(''));

export const leadInputSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  area: z.string().trim().max(100).optional(),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter a valid 6-digit pin code')
    .optional()
    .or(z.literal('')),
  serviceInterest: z.string().trim().max(100).optional(),
  preferredDate: z.string().trim().max(20).optional(),
  preferredWindow: z.string().trim().max(50).optional(),
  message: messageSchema,
  website: honeypotSchema,
});
export type LeadInput = z.infer<typeof leadInputSchema>;

export const contactInputSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  message: z.string().trim().min(5, 'Tell us a little more').max(1000),
  website: honeypotSchema,
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const b2bEnquiryInputSchema = z.object({
  name: nameSchema,
  businessName: z.string().trim().min(2, 'Enter your business name').max(150),
  businessType: z.enum(['hotel', 'houseboat', 'guesthouse', 'restaurant', 'other']).optional(),
  phone: phoneSchema,
  email: z.string().trim().email('Enter a valid email address'),
  message: z.string().trim().max(1000).optional(),
  website: honeypotSchema,
});
export type B2bEnquiryInput = z.infer<typeof b2bEnquiryInputSchema>;
