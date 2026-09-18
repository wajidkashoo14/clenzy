'use client';

import { Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { submitReview } from '@/features/orders/api';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}): ReactNode {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          onClick={() => onChange(star)}
          className="focus-visible:shadow-focus rounded focus-visible:outline-none"
        >
          <Star
            className={cn(
              'size-7',
              star <= value ? 'fill-accent text-accent' : 'text-border-strong',
            )}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({
  orderNumber,
  onSubmitted,
}: {
  orderNumber: string;
  onSubmitted: () => void;
}): ReactNode {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await submitReview(orderNumber, { rating, comment: comment.trim() || undefined });
      toast.success('Thanks for the feedback!');
      onSubmitted();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not submit your review.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-text text-sm font-semibold">How was your order?</p>
      <StarPicker value={rating} onChange={setRating} />
      <Textarea
        label="Comments (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        placeholder="Tell us what stood out…"
      />
      <Button
        size="sm"
        className="self-start"
        disabled={rating === 0}
        isLoading={isSubmitting}
        onClick={() => void handleSubmit()}
      >
        Submit review
      </Button>
    </div>
  );
}
