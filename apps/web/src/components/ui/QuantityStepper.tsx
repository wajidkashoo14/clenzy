'use client';

import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Required: this control has no visible label of its own — see docs/ACCESSIBILITY_AND_MOBILE.md §11. */
  'aria-label': string;
}

/**
 * −/+ with a typable number, clamped [min, max]. See docs/DESIGN_SYSTEM.md §5.
 *
 * ANIMATION_SYSTEM.md §4.13 specifies a directional slide animation on the
 * number when it changes. An AnimatePresence-based version of that was
 * built and tested, but hit the same bug confirmed in Modal.tsx: Framer's
 * exit animation never reported completion (verified directly — clicking
 * +3 times left 3 stale `<input>` elements stacked in the DOM, one per
 * click, each showing a different value). Given that failure mode is now
 * confirmed twice in this codebase, the slide is dropped here in favor of a
 * plain, guaranteed-correct number display — a `layout`-driven or
 * CSS-only re-attempt is a reasonable follow-up, not a blocker.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  disabled,
  'aria-label': ariaLabel,
}: QuantityStepperProps): ReactNode {
  const [inputValue, setInputValue] = useState(String(value));

  function commit(next: number): void {
    const clamped = Math.min(max, Math.max(min, next));
    onChange(clamped);
    setInputValue(String(clamped));
  }

  function handleInputChange(raw: string): void {
    setInputValue(raw.replace(/\D/g, ''));
  }

  function handleInputBlur(): void {
    commit(inputValue === '' ? min : Number(inputValue));
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="border-border-strong bg-surface inline-flex items-center rounded-md border"
    >
      <button
        type="button"
        onClick={() => commit(value - 1)}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${ariaLabel}`}
        className={cn(
          'text-text flex size-9 items-center justify-center rounded-l-md',
          'duration-fast ease-standard transition-[background-color,transform] active:scale-95',
          'hover:bg-surface-alt disabled:pointer-events-none disabled:opacity-35',
          'focus-visible:shadow-focus focus-visible:outline-none',
        )}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>

      <div className="text-text flex h-9 w-9 items-center justify-center text-sm font-semibold tabular-nums">
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleInputBlur}
          onFocus={(e) => e.target.select()}
          className="w-9 bg-transparent text-center outline-none disabled:cursor-not-allowed"
        />
      </div>

      <button
        type="button"
        onClick={() => commit(value + 1)}
        disabled={disabled || value >= max}
        aria-label={`Increase ${ariaLabel}`}
        className={cn(
          'text-text flex size-9 items-center justify-center rounded-r-md',
          'duration-fast ease-standard transition-[background-color,transform] active:scale-95',
          'hover:bg-surface-alt disabled:pointer-events-none disabled:opacity-35',
          'focus-visible:shadow-focus focus-visible:outline-none',
        )}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
