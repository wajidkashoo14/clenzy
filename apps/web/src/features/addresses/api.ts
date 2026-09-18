import type { AddressInput, AddressPayload } from '@clenzy/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';

export function listAddresses(): Promise<{ addresses: AddressPayload[] }> {
  return apiGet('/api/v1/addresses');
}

export function createAddress(input: AddressInput): Promise<{ address: AddressPayload }> {
  return apiPost('/api/v1/addresses', input);
}

export function updateAddress(
  id: string,
  input: Partial<AddressInput>,
): Promise<{ address: AddressPayload }> {
  return apiPatch(`/api/v1/addresses/${id}`, input);
}

export function deleteAddress(id: string): Promise<{ deleted: true }> {
  return apiDelete(`/api/v1/addresses/${id}`);
}

export function setDefaultAddress(id: string): Promise<{ address: AddressPayload }> {
  return apiPost(`/api/v1/addresses/${id}/default`, {});
}
