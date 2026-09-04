/**
 * Normalizes Indian mobile numbers to E.164 (`+91XXXXXXXXXX`) so
 * `9876543210`, `+919876543210`, and `09876543210` all resolve to the same
 * identity — see docs/SECURITY.md §1. Returns `null` for anything that
 * isn't a plausible 10-digit Indian mobile number.
 */
export function normalizePhoneIN(raw: string): string | null {
  const digitsOnly = raw.replace(/[^\d]/g, '');

  let national: string;
  if (digitsOnly.length === 10) {
    national = digitsOnly;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    national = digitsOnly.slice(1);
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    national = digitsOnly.slice(2);
  } else {
    return null;
  }

  // Indian mobile numbers start with 6, 7, 8, or 9.
  if (!/^[6-9]\d{9}$/.test(national)) return null;

  return `+91${national}`;
}
