import { randomInt } from 'node:crypto';

const OTP_MIN = 100_000;
const OTP_MAX = 999_999;

/** 6-digit OTP, cryptographically random — never `Math.random()`. See docs/SECURITY.md §1. */
export function generateOtp(): string {
  return String(randomInt(OTP_MIN, OTP_MAX + 1));
}
