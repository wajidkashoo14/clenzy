/** User roles, in ascending order of privilege. See docs/PROJECT_REQUIREMENTS.md §4. */
export const ROLES = ['customer', 'agent', 'staff', 'admin', 'superadmin'] as const;

export type Role = (typeof ROLES)[number];

const ROLE_RANK: Record<Role, number> = {
  customer: 0,
  agent: 1,
  staff: 2,
  admin: 3,
  superadmin: 4,
};

/** True if `role` meets or exceeds the privilege level of `required`. */
export function hasRole(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}
