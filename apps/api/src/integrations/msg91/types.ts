/** No file outside integrations/msg91/ may import an SMS provider's SDK directly — see docs/ARCHITECTURE.md §4. */
export interface SmsAdapter {
  sendOtp(phone: string, code: string): Promise<void>;
}
