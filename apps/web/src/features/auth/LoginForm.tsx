'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OTPInput } from '@/components/ui/OTPInput';
import { requestOtp, verifyOtp } from '@/features/auth/api';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';

const RESEND_COOLDOWN_SECONDS = 30;

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
      router.push(searchParams.get('redirect') || '/account');
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
    </form>
  );
}
