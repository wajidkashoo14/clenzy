import type { Settings, UpdateSettingsInput } from '@clenzy/shared';
import { apiGet, apiPatch } from '@/lib/api-client';

export function getSettings(): Promise<{ settings: Settings }> {
  return apiGet('/api/v1/admin/settings');
}
export function updateSettings(input: UpdateSettingsInput): Promise<{ settings: Settings }> {
  return apiPatch('/api/v1/admin/settings', input);
}
