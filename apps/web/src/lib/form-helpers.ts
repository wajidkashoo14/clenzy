import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api-client';

/**
 * Maps server-side validation errors (docs/API_SPEC.md §0 error envelope)
 * back onto the corresponding React Hook Form fields, and returns a
 * top-level message to show regardless (e.g. in a toast).
 */
export function applyApiErrorToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_ERROR' && error.details) {
      for (const detail of error.details) {
        if (detail.field) {
          setError(detail.field as Path<T>, { type: 'server', message: detail.message });
        }
      }
    }
    return error.message;
  }
  return "Something went wrong on our end. Please try again, or reach us directly — we're happy to help.";
}
