import type { PincodeCheckResult, ServiceAreaPayload } from '@clenzy/shared';
import type { ClientSession } from 'mongoose';
import type { ServiceAreaDocument } from '../models/ServiceArea.js';
import { ServiceArea } from '../models/ServiceArea.js';
import { AppError } from '../utils/AppError.js';

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

/**
 * Shared by `checkPincode` below and `addresses.service.ts`'s serviceability
 * check on save. Requires both legs available — a laundry order always needs
 * a pickup and a delivery, so an area with either paused (see
 * `assertAreaAcceptingOrders` below) isn't usable end-to-end yet.
 */
export async function resolveAreaForPincode(
  pincode: string,
): Promise<{ area: AreaLean | null; nearestAreas: AreaLean[] }> {
  const area = await ServiceArea.findOne({
    pincodes: pincode,
    isActive: true,
    pickupAvailable: true,
    deliveryAvailable: true,
  }).lean();
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

/**
 * `placeOrder`/`createManualOrder` trust an address's already-saved
 * `serviceAreaId` rather than re-resolving from its pincode, so an area
 * paused (docs/ADMIN_DASHBOARD.md §8 "pause area" — snow closures, curfews)
 * *after* the address was saved must still be caught at order-placement
 * time — otherwise "stop accepting orders for an area in seconds" wouldn't
 * actually stop anything for a customer with an existing saved address.
 */
export async function assertAreaAcceptingOrders(
  areaId: string,
  leg: 'pickup' | 'delivery',
  session?: ClientSession,
): Promise<void> {
  const area = await ServiceArea.findById(areaId)
    .session(session ?? null)
    .lean();
  const available = Boolean(
    area?.isActive && (leg === 'pickup' ? area.pickupAvailable : area.deliveryAvailable),
  );
  if (!available) {
    throw AppError.unprocessable(
      'AREA_NOT_SERVICEABLE',
      `We're not currently accepting ${leg === 'pickup' ? 'pickups' : 'deliveries'} in this area — please try again later.`,
    );
  }
}
