import type { AreaAvailabilityInput, CreateAreaInput, UpdateAreaInput } from '@clenzy/shared';
import { isValidObjectId } from 'mongoose';
import { ServiceArea, type ServiceAreaDocument } from '../models/ServiceArea.js';
import { logAudit } from './auditLog.service.js';
import { AppError } from '../utils/AppError.js';

type AreaLean = ServiceAreaDocument & { _id: unknown };

interface Actor {
  id: string;
  role: string;
}

/** See docs/ADMIN_DASHBOARD.md §8 — "duplicate detection across areas" for pincodes. */
async function assertPincodesNotClaimed(pincodes: string[], excludeAreaId?: string): Promise<void> {
  const clash = await ServiceArea.findOne({
    pincodes: { $in: pincodes },
    ...(excludeAreaId ? { _id: { $ne: excludeAreaId } } : {}),
  }).lean();
  if (clash) {
    const overlapping = pincodes.filter((p) => clash.pincodes.includes(p));
    throw AppError.badRequest(
      'PINCODE_ALREADY_ASSIGNED',
      `Pincode(s) ${overlapping.join(', ')} are already assigned to "${clash.area}".`,
    );
  }
}

export async function listAreasAdmin(): Promise<AreaLean[]> {
  return ServiceArea.find({}).sort({ city: 1, area: 1 }).lean();
}

export async function getAreaAdmin(id: string): Promise<AreaLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Area not found.');
  const area = await ServiceArea.findById(id).lean();
  if (!area) throw AppError.notFound('Area not found.');
  return area;
}

export async function createArea(actor: Actor, input: CreateAreaInput): Promise<AreaLean> {
  const existingSlug = await ServiceArea.findOne({ slug: input.slug }).lean();
  if (existingSlug)
    throw AppError.badRequest('SLUG_TAKEN', `The slug "${input.slug}" is already in use.`);
  await assertPincodesNotClaimed(input.pincodes);

  const area = await ServiceArea.create(input);
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'area.create',
    entityType: 'ServiceArea',
    entityId: String(area._id),
    after: area.toObject(),
  });
  return area.toObject();
}

export async function updateArea(
  actor: Actor,
  id: string,
  input: UpdateAreaInput,
): Promise<AreaLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Area not found.');
  const area = await ServiceArea.findById(id);
  if (!area) throw AppError.notFound('Area not found.');

  if (input.slug && input.slug !== area.slug) {
    const existingSlug = await ServiceArea.findOne({ slug: input.slug, _id: { $ne: id } }).lean();
    if (existingSlug)
      throw AppError.badRequest('SLUG_TAKEN', `The slug "${input.slug}" is already in use.`);
  }
  if (input.pincodes) await assertPincodesNotClaimed(input.pincodes, id);

  const before = area.toObject();
  Object.assign(area, input);
  await area.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'area.update',
    entityType: 'ServiceArea',
    entityId: id,
    before,
    after: area.toObject(),
  });
  return area.toObject();
}

/**
 * The "pause area" control — see docs/ADMIN_DASHBOARD.md §8: "ops must be
 * able to stop accepting orders for an area in seconds." Backed by the same
 * `pickupAvailable`/`deliveryAvailable` flags `assertAreaAcceptingOrders()`
 * (orders.service.ts) checks at order-placement time, so this isn't cosmetic.
 */
export async function setAreaAvailability(
  actor: Actor,
  id: string,
  input: AreaAvailabilityInput,
): Promise<AreaLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Area not found.');
  const area = await ServiceArea.findById(id);
  if (!area) throw AppError.notFound('Area not found.');

  const before = area.toObject();
  if (input.pickupAvailable !== undefined) area.pickupAvailable = input.pickupAvailable;
  if (input.deliveryAvailable !== undefined) area.deliveryAvailable = input.deliveryAvailable;
  await area.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'area.set-availability',
    entityType: 'ServiceArea',
    entityId: id,
    before,
    after: area.toObject(),
  });
  return area.toObject();
}

/** Deactivate (never hard-delete) — the permanent version of "pause"; see docs/API_SPEC.md §10. */
export async function deactivateArea(actor: Actor, id: string): Promise<AreaLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Area not found.');
  const area = await ServiceArea.findById(id);
  if (!area) throw AppError.notFound('Area not found.');

  const before = area.toObject();
  area.isActive = false;
  await area.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'area.deactivate',
    entityType: 'ServiceArea',
    entityId: id,
    before,
    after: area.toObject(),
  });
  return area.toObject();
}
