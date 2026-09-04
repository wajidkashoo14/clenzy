import { z } from 'zod';

/** See docs/API_SPEC.md §2 — /addresses. */

const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Enter a valid phone number')
  .max(15)
  .regex(/^[+\d][\d\s-]{9,14}$/, 'Enter a valid phone number');

const pincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter a valid 6-digit pin code');

export const addressInputSchema = z.object({
  label: z.enum(['home', 'work', 'other']),
  contactName: z.string().trim().min(1, 'Enter a contact name').max(100),
  contactPhone: phoneSchema,
  line1: z.string().trim().min(1, 'Enter the address line').max(200),
  line2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(200).optional(),
  area: z.string().trim().min(1, 'Enter the area').max(100),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: pincodeSchema,
  geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressInputSchema>;

export const addressSchema = z.object({
  id: z.string(),
  label: z.enum(['home', 'work', 'other']),
  contactName: z.string(),
  contactPhone: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  area: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  serviceAreaId: z.string().optional(),
  isServiceable: z.boolean(),
  isDefault: z.boolean(),
});
export type AddressPayload = z.infer<typeof addressSchema>;
