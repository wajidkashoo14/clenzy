import type {
  CreateSlotTemplateInput,
  SlotCapacityOverrideInput,
  SlotCapacityQuery,
  SlotDay,
  UpdateSlotTemplateInput,
} from '@clenzy/shared';
import { isValidObjectId } from 'mongoose';
import { SlotCapacity } from '../models/SlotCapacity.js';
import { SlotTemplate, type SlotTemplateDocument } from '../models/SlotTemplate.js';
import { logAudit } from './auditLog.service.js';
import { getSlotAvailability } from './slots.service.js';
import { AppError } from '../utils/AppError.js';
import { dayOfWeekOfDateString } from '../utils/timezone.js';

type TemplateLean = SlotTemplateDocument & { _id: unknown };

interface Actor {
  id: string;
  role: string;
}

export async function listSlotTemplatesAdmin(): Promise<TemplateLean[]> {
  return SlotTemplate.find({}).sort({ type: 1, dayOfWeek: 1, window: 1 }).lean();
}

export async function createSlotTemplate(
  actor: Actor,
  input: CreateSlotTemplateInput,
): Promise<TemplateLean> {
  const template = await SlotTemplate.create(input);
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'slotTemplate.create',
    entityType: 'SlotTemplate',
    entityId: String(template._id),
    after: template.toObject(),
  });
  return template.toObject();
}

export async function updateSlotTemplate(
  actor: Actor,
  id: string,
  input: UpdateSlotTemplateInput,
): Promise<TemplateLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Slot template not found.');
  const template = await SlotTemplate.findById(id);
  if (!template) throw AppError.notFound('Slot template not found.');

  const before = template.toObject();
  Object.assign(template, input);
  await template.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'slotTemplate.update',
    entityType: 'SlotTemplate',
    entityId: id,
    before,
    after: template.toObject(),
  });
  return template.toObject();
}

/** Deactivate (never hard-delete) — a past order's slot snapshot must remain meaningful. */
export async function deactivateSlotTemplate(actor: Actor, id: string): Promise<TemplateLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Slot template not found.');
  const template = await SlotTemplate.findById(id);
  if (!template) throw AppError.notFound('Slot template not found.');

  const before = template.toObject();
  template.isActive = false;
  await template.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'slotTemplate.deactivate',
    entityType: 'SlotTemplate',
    entityId: id,
    before,
    after: template.toObject(),
  });
  return template.toObject();
}

/**
 * The admin "Capacity view" calendar — see docs/ADMIN_DASHBOARD.md §9. Reuses
 * `getSlotAvailability()` (the same advisory computation `GET /slots`
 * serves customers) rather than a second implementation, so the admin
 * calendar and the customer-facing availability can never drift apart.
 */
export async function getSlotCapacityCalendar(
  query: SlotCapacityQuery,
): Promise<{ dates: SlotDay[] }> {
  return getSlotAvailability(query);
}

/**
 * Override capacity for one date (extra staff, a festival) or block it
 * entirely (`capacity: 0`) — see docs/ADMIN_DASHBOARD.md §9. Requires a
 * matching active template to exist so this can't create a capacity record
 * for a slot that was never actually offered.
 */
export async function overrideSlotCapacity(actor: Actor, input: SlotCapacityOverrideInput) {
  if (!isValidObjectId(input.areaId)) throw AppError.badRequest('INVALID_AREA', 'Invalid area id.');

  const template = await SlotTemplate.findOne({
    type: input.type,
    window: input.window,
    dayOfWeek: dayOfWeekOfDateString(input.date),
    $or: [{ areaIds: { $size: 0 } }, { areaIds: input.areaId }],
  }).lean();
  if (!template) {
    throw AppError.notFound(
      `No slot template offers ${input.type} "${input.window}" on this date.`,
    );
  }

  const before = await SlotCapacity.findOne({
    date: input.date,
    window: input.window,
    type: input.type,
    areaId: input.areaId,
  }).lean();

  const capacityDoc = await SlotCapacity.findOneAndUpdate(
    { date: input.date, window: input.window, type: input.type, areaId: input.areaId },
    { $set: { capacity: input.capacity }, $setOnInsert: { booked: 0 } },
    { upsert: true, new: true },
  );

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'slotCapacity.override',
    entityType: 'SlotCapacity',
    entityId: String(capacityDoc._id),
    before,
    after: capacityDoc.toObject(),
  });
  return capacityDoc.toObject();
}
