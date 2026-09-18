import { z } from 'zod';

/** See docs/API_SPEC.md §10 — `GET /admin/audit-logs?entityType=&actorId=&from=` (SUPERADMIN only). */
export const auditLogQuerySchema = z.object({
  entityType: z.string().trim().optional(),
  actorId: z.string().trim().optional(),
  from: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
