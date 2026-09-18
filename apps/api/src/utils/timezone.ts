/**
 * Clenzy serves one timezone (Asia/Kolkata, UTC+5:30, no DST) — see the
 * comment on `SlotCapacity.date`. Fixed-offset arithmetic sidesteps any
 * dependency on the server process's own TZ or ICU data being correct.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function nowInKolkata(): { dateString: string; minutesOfDay: number } {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return {
    dateString: ist.toISOString().slice(0, 10),
    minutesOfDay: ist.getUTCHours() * 60 + ist.getUTCMinutes(),
  };
}

/** "09:00" → 540. */
export function minutesOfDayFromTime(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/** Callers always pass a Zod-validated `\d{4}-\d{2}-\d{2}` string — this only guards the type. */
function parseDateString(dateString: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) throw new Error(`Invalid date string: ${dateString}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** "YYYY-MM-DD" + N days → "YYYY-MM-DD", using UTC arithmetic so it can't drift across a DST-less offset. */
export function addDaysToDateString(dateString: string, days: number): string {
  const { year, month, day } = parseDateString(dateString);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** 0 (Sunday) – 6 (Saturday), matching `SlotTemplate.dayOfWeek`. */
export function dayOfWeekOfDateString(dateString: string): number {
  const { year, month, day } = parseDateString(dateString);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
