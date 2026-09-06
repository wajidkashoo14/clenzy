import { z } from 'zod';

/** See docs/ADMIN_DASHBOARD.md §10 and docs/DATABASE.md "staff — not a separate collection". */

/** Blank strings (e.g. an untouched form field) mean "not set", same as omitting the field. */
function optionalTimeField(label: string) {
  return z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{2}:\d{2}$/.test(v), { message: `${label} must be HH:MM` })
    .transform((v) => (v ? v : undefined));
}

export const createAgentInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(10).max(15),
  employeeId: z.string().trim().max(50).optional(),
  assignedAreas: z.array(z.string().trim().min(1)).optional().default([]),
  vehicleNumber: z.string().trim().max(20).optional(),
  shiftStart: optionalTimeField('shiftStart'),
  shiftEnd: optionalTimeField('shiftEnd'),
});
export type CreateAgentInput = z.infer<typeof createAgentInputSchema>;

export const updateAgentInputSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  employeeId: z.string().trim().max(50).optional(),
  assignedAreas: z.array(z.string().trim().min(1)).optional(),
  vehicleNumber: z.string().trim().max(20).optional(),
  isAvailable: z.boolean().optional(),
  shiftStart: optionalTimeField('shiftStart'),
  shiftEnd: optionalTimeField('shiftEnd'),
});
export type UpdateAgentInput = z.infer<typeof updateAgentInputSchema>;

/** `PATCH /admin/users/:id/role` — SUPERADMIN only, per docs/API_SPEC.md §10. */
export const changeUserRoleInputSchema = z.object({
  role: z.enum(['customer', 'agent', 'staff', 'admin', 'superadmin']),
});
export type ChangeUserRoleInput = z.infer<typeof changeUserRoleInputSchema>;
