import type { SlotDay, SlotsQuery, SlotWindow } from '@clenzy/shared';
import { isValidObjectId } from 'mongoose';
import { SLOT_DEFAULTS } from '../config/slots.js';
import { SlotCapacity } from '../models/SlotCapacity.js';
import { SlotTemplate } from '../models/SlotTemplate.js';
import { AppError } from '../utils/AppError.js';
import {
  addDaysToDateString,
  dayOfWeekOfDateString,
  minutesOfDayFromTime,
  nowInKolkata,
} from '../utils/timezone.js';

/**
 * A window becomes unbookable at the earlier of: its own start time (minus
 * the template's per-window lead time), or — for today only — the global
 * same-day cutoff. See docs/PROJECT_REQUIREMENTS.md §7 and the field
 * comment on `SlotTemplate.cutoffMinutesBefore`.
 *
 * Shared with `orders.service.ts`, which re-runs this same check
 * authoritatively inside the placement transaction rather than trusting
 * whatever the client last saw from `GET /slots`.
 */
export function isSlotCutoffPassed(
  date: string,
  window: string,
  cutoffMinutesBefore: number,
): boolean {
  const { dateString: today, minutesOfDay: nowMinutes } = nowInKolkata();
  if (date < today) return true;
  if (date > today) return false;

  const windowStartMinutes = minutesOfDayFromTime(window.split('-')[0] ?? '00:00');
  const leadTimeCutoff = windowStartMinutes - cutoffMinutesBefore;
  const effectiveCutoff = Math.min(leadTimeCutoff, SLOT_DEFAULTS.sameDayCutoffMinutesOfDay);
  return nowMinutes >= effectiveCutoff;
}

/** See docs/API_SPEC.md §4 — GET /slots. Advisory only; the order transaction re-checks capacity authoritatively. */
export async function getSlotAvailability(query: SlotsQuery): Promise<{ dates: SlotDay[] }> {
  if (!isValidObjectId(query.areaId)) throw AppError.notFound('Area not found.');

  const templates = await SlotTemplate.find({
    type: query.type,
    isActive: true,
    $or: [{ areaIds: { $size: 0 } }, { areaIds: query.areaId }],
  })
    .sort({ window: 1 })
    .lean();

  const lastDate = addDaysToDateString(query.from, query.days - 1);
  const capacityDocs = await SlotCapacity.find({
    type: query.type,
    areaId: query.areaId,
    date: { $gte: query.from, $lte: lastDate },
  }).lean();
  const capacityByDateWindow = new Map(capacityDocs.map((c) => [`${c.date}|${c.window}`, c]));

  const dates: SlotDay[] = [];
  for (let i = 0; i < query.days; i += 1) {
    const date = addDaysToDateString(query.from, i);
    const dayOfWeek = dayOfWeekOfDateString(date);

    const windows: SlotWindow[] = templates
      .filter((template) => template.dayOfWeek === dayOfWeek)
      .map((template) => {
        // An admin-overridden `SlotCapacity.capacity` for this date takes
        // priority over the template's default — see reserveSlot() in
        // orders.service.ts, which guards bookings the same way.
        const override = capacityByDateWindow.get(`${date}|${template.window}`);
        const capacity = override?.capacity ?? template.capacity;
        const booked = override?.booked ?? 0;
        const available = Math.max(0, capacity - booked);
        const cutoffPassed = isSlotCutoffPassed(
          date,
          template.window,
          template.cutoffMinutesBefore,
        );
        const isFull = available <= 0;

        return {
          window: template.window,
          label: template.label,
          capacity,
          booked,
          available,
          cutoffPassed,
          disabled: cutoffPassed || isFull,
          disabledReason: cutoffPassed
            ? 'Booking for this slot has closed.'
            : isFull
              ? 'Fully booked.'
              : undefined,
        };
      });

    // No holiday calendar yet — see docs/PROJECT_REQUIREMENTS.md's V2 section.
    dates.push({ date, isHoliday: false, windows });
  }

  return { dates };
}
