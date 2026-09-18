/** "2026-09-05" + 1 → "2026-09-06". UTC arithmetic so it never drifts across a local-midnight boundary. */
export function addDaysToDateString(dateString: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) throw new Error(`Invalid date string: ${dateString}`);
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + days))
    .toISOString()
    .slice(0, 10);
}

const kolkataDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });

/** Today's date as Asia/Kolkata sees it (Clenzy's only timezone) — not the visitor's browser timezone. */
export function todayInKolkata(): string {
  return kolkataDateFormatter.format(new Date());
}
