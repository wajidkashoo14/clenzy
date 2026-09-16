import { z } from 'zod';

/** Minimal agent summary for assignment dropdowns — see docs/ADMIN_DASHBOARD.md §3 "Assignment". */
export const adminAgentSummarySchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  // Optional: Google-created users are phone-less until they add one.
  phone: z.string().optional(),
});
export type AdminAgentSummary = z.infer<typeof adminAgentSummarySchema>;
