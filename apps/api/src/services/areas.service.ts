import type { PincodeCheckResult, ServiceAreaPayload } from '@clenzy/shared';
import type { ServiceAreaDocument } from '../models/ServiceArea.js';
import { ServiceArea } from '../models/ServiceArea.js';

export type AreaLean = ServiceAreaDocument & { _id: unknown };

export function toAreaPayload(area: AreaLean): ServiceAreaPayload {
  return {
    id: String(area._id),
    city: area.city,
    state: area.state,
    area: area.area,
    slug: area.slug,
    pickupAvailable: area.pickupAvailable,
    deliveryAvailable: area.deliveryAvailable,
    expressAvailable: area.expressAvailable,
    deliveryFee: area.deliveryFee,
    minOrderValue: area.minOrderValue,
  };
}

export async function getAreas(): Promise<ServiceAreaPayload[]> {
  const areas = await ServiceArea.find({ isActive: true }).sort({ area: 1 }).lean();
  return areas.map(toAreaPayload);
}

/** Shared by `checkPincode` below and `addresses.service.ts`'s serviceability check on save. */
export async function resolveAreaForPincode(
  pincode: string,
): Promise<{ area: AreaLean | null; nearestAreas: AreaLean[] }> {
  const area = await ServiceArea.findOne({ pincodes: pincode, isActive: true }).lean();
  if (area) return { area, nearestAreas: [] };

  // No geo-distance data to rank "nearest" by yet — surface every active area
  // as a reasonable fallback until docs/DATABASE.md's `geoPolygon` (V2) lands.
  const nearestAreas = await ServiceArea.find({ isActive: true }).sort({ area: 1 }).limit(5).lean();
  return { area: null, nearestAreas };
}

/** See docs/API_SPEC.md §4 — GET /areas/check. */
export async function checkPincode(pincode: string): Promise<PincodeCheckResult> {
  const { area, nearestAreas } = await resolveAreaForPincode(pincode);
  if (area) return { serviceable: true, area: toAreaPayload(area) };
  return { serviceable: false, nearestAreas: nearestAreas.map(toAreaPayload) };
}
