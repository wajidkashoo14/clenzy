import type { AdminAgentSummary } from '@clenzy/shared';
import { User } from '../models/User.js';

/**
 * Minimal agent directory for assignment dropdowns (order detail, roster
 * bulk-assign). Full staff management — creating accounts, areas, shift
 * hours, workload stats — is docs/ADMIN_DASHBOARD.md §10 (Phase 12b).
 */
export async function listAgents(): Promise<AdminAgentSummary[]> {
  const agents = await User.find({ role: 'agent', status: 'active' })
    .select('name phone')
    .sort({ name: 1 })
    .lean();
  return agents.map((agent) => ({ id: String(agent._id), name: agent.name, phone: agent.phone }));
}
