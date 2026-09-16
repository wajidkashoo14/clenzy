'use client';

import { AlertCircle } from 'lucide-react';
import type { ClipboardEvent, KeyboardEvent, ReactNode } from 'react';
import { useId, useRef } from 'react';
import { cn } from '@/lib/cn';

export interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Six (default) single-digit boxes with auto-advance, backspace-to-previous,
 * and paste support — see docs/DESIGN_SYSTEM.md §5. `autoComplete="one-time-code"`
 * on the first box is the pragmatic cross-browser SMS-autofill hook; the
 * WebOTP API (`navigator.credentials.get`) is a V2 enhancement that needs
 * cooperation from the SMS template's format (see docs/INTEGRATIONS.md §2.3)
 * so it's out of scope for this UI primitive alone.
 */
export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  label = 'Enter the verification code',
  error,
  disabled,
}: OTPInputProps): ReactNode {
  const groupId = useId();
  const errorId = error ? `${groupId}-error` : undefined;
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function setDigit(index: number, digit: string): void {
    const next = digits.slice();
    next[index] = digit;
    const nextValue = next.join('');
    onChange(nextValue);
    if (nextValue.length === length && !nextValue.includes('')) onComplete?.(nextValue);
  }

  function handleChange(index: number, raw: string): void {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setDigit(index, digit);
    if (digit && index < length - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setDigit(index - 1, '');
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>): void {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    event.preventDefault();

    const next = digits.slice();
    let cursor = index;
    for (const char of pasted) {
      if (cursor >= length) break;
      next[cursor] = char;
      cursor += 1;
    }
    const nextValue = next.join('');
    onChange(nextValue);
    if (nextValue.length === length && !nextValue.includes('')) onComplete?.(nextValue);
    inputRefs.current[Math.min(cursor, length - 1)]?.focus();
  }

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={errorId}>
      <legend className="text-text text-sm font-medium">{label}</legend>

      <div className="flex gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={Boolean(error) || undefined}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(index, e)}
            className={cn(
              'border-border bg-surface text-text hover:border-border-strong h-12 w-11 rounded-md border text-center text-lg font-semibold tabular-nums',
              'duration-base transition-[border-color,box-shadow] ease-out',
              'focus-visible:border-primary focus-visible:shadow-focus focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-45',
              error && 'border-error focus-visible:border-error',
            )}
          />
        ))}
      </div>

      {error && (
        <p id={errorId} className="text-error flex items-center gap-1 text-[13px]">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
