/**
 * A known, expected application error carrying an HTTP status and a stable,
 * machine-readable error code the frontend maps to user-facing copy. See the
 * error envelope shape in docs/API_SPEC.md §0.
 *
 * Throw `AppError` for anything the caller could reasonably act on (bad
 * input, a business-rule violation, a not-found resource). Let genuinely
 * unexpected errors propagate as-is — the error handler reports those as 500s
 * without leaking internals.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Array<{ field?: string; message: string }>;
  /** Extra machine-readable fields merged into the error envelope — e.g. `nearestServiceableAreas` per docs/API_SPEC.md §2. */
  readonly extra?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Array<{ field?: string; message: string }>,
    extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.extra = extra;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(code: string, message: string, details?: AppError['details']): AppError {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = 'Authentication required.'): AppError {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have permission to do this.'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found.'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(code: string, message: string, extra?: Record<string, unknown>): AppError {
    return new AppError(409, code, message, undefined, extra);
  }

  static unprocessable(
    code: string,
    message: string,
    details?: AppError['details'],
    extra?: Record<string, unknown>,
  ): AppError {
    return new AppError(422, code, message, details, extra);
  }
}
