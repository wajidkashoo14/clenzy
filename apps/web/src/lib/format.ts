/** ₹ formatting — money is always paise integers over the wire, per docs/API_SPEC.md §0. */
const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** e.g. `formatRupees(4000)` → "₹40". */
export function formatRupees(paise: number): string {
  return rupeeFormatter.format(paise / 100);
}

const dateChipFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
});

/** "2026-09-05" → "Sat, 5 Sep". Parses as a plain calendar date — never shifts across a UTC/local-midnight boundary. */
export function formatSlotDate(dateString: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return dateString;
  const [, year, month, day] = match;
  return dateChipFormatter.format(
    new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12)),
  );
}

function to12Hour(hhmm: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return hhmm;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0
    ? `${hour12} ${period}`
    : `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** "09:00-11:00" → "9 AM – 11 AM". */
export function formatSlotWindow(window: string): string {
  const [start, end] = window.split('-');
  if (!start || !end) return window;
  return `${to12Hour(start)} – ${to12Hour(end)}`;
}
