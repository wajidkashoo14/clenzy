'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OTPInput } from '@/components/ui/OTPInput';
import { requestOtp, verifyOtp } from '@/features/auth/api';
import { ApiError, API_ORIGIN } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';

const RESEND_COOLDOWN_SECONDS = 30;

/** Human-readable copy for the API's ?authError= codes after a Google round-trip. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured:
    'Google sign-in isn’t set up on the server yet — use your phone number for now.',
  google_denied: 'Google sign-in was cancelled.',
  google_state_mismatch: 'That sign-in link expired. Please try again.',
  google_failed: 'Google sign-in failed. Please try again, or use your phone number.',
} as const;

type Step = 'phone' | 'otp';

export function LoginForm(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [requestId, setRequestId] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  // Set by the API when a Google sign-in round-trip fails — see the callback
  // controller in apps/api.
  const authError = searchParams.get('authError') ?? undefined;

  useEffect(() => () => clearInterval(cooldownTimer.current), []);

  function startCooldown(): void {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          clearInterval(cooldownTimer.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  async function sendOtp(): Promise<void> {
    setPhoneError(undefined);
    setIsSubmitting(true);
    try {
      const result = await requestOtp(phone, 'login');
      setRequestId(result.requestId);
      setStep('otp');
      setCode('');
      startCooldown();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not send the code.';
      setPhoneError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verify(submittedCode: string): Promise<void> {
    setCodeError(undefined);
    setIsSubmitting(true);
    try {
      const { user } = await verifyOtp(phone, submittedCode, requestId);
      setUser(user);
      toast.success(user.isNewUser ? 'Welcome to Clenzy!' : 'Welcome back!');
      router.push(searchParams.get('redirect') || '/');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not verify the code.';
      setCodeError(message);
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === 'otp') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-text-muted text-sm">
          Enter the 6-digit code sent to <span className="text-text font-medium">+91 {phone}</span>.
        </p>

        <OTPInput
          value={code}
          onChange={setCode}
          onComplete={verify}
          error={codeError}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-text-muted hover:text-text underline disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => setStep('phone')}
          >
            Change number
          </button>
          <button
            type="button"
            className="text-primary disabled:text-text-muted underline disabled:cursor-not-allowed disabled:no-underline"
            disabled={cooldown > 0 || isSubmitting}
            onClick={sendOtp}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>

        <Button
          size="lg"
          isLoading={isSubmitting}
          onClick={() => void verify(code)}
          disabled={code.length !== 6}
        >
          Verify & continue
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void sendOtp();
      }}
    >
      {authError && (
        <p className="bg-error-soft text-error rounded-lg px-3.5 py-2.5 text-sm" role="alert">
          {AUTH_ERROR_MESSAGES[authError] ?? 'Sign-in failed. Please try again.'}
        </p>
      )}

      <Input
        label="Phone number"
        prefix="+91"
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="98765 43210"
        value={phone}
        error={phoneError}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
      />
      <Button type="submit" size="lg" isLoading={isSubmitting} disabled={phone.length < 10}>
        Send OTP
      </Button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="bg-border h-px flex-1" />
        <span className="text-text-muted text-xs font-medium tracking-wide uppercase">or</span>
        <span className="bg-border h-px flex-1" />
      </div>

      {/* Full-page navigation to the API's OAuth start endpoint (not fetch) —
          Google needs a top-level redirect; the API sets session cookies and
          lands back in the app. See docs/INTEGRATIONS.md §2.13. */}
      <Button asChild size="lg" variant="secondary">
        <a href={`${API_ORIGIN}/api/v1/auth/google`}>
          <svg viewBox="0 0 18 18" className="size-4.5" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
            />
          </svg>
          Continue with Google
        </a>
      </Button>
    </form>
  );
}
