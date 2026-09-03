import type { NextFunction, Request, Response } from 'express';
import { isProduction } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';

interface ZodLikeError {
  issues: { path: (string | number)[]; message: string }[];
}

/**
 * Duck-typed rather than `instanceof ZodError` — this monorepo has multiple
 * separate zod installations (apps/api, apps/web, and packages/shared each
 * nest their own copy of zod@3.25.76, because a stray zod@4 hoisted at the
 * workspace root from an ESLint plugin's dependency chain blocks npm from
 * deduping them into one). Schemas built with packages/shared's zod
 * instance throw ZodError objects whose prototype belongs to a *different*
 * module instance than the one this file would import, so `instanceof`
 * silently fails and every validation error was falling through to the
 * generic 500 handler below. Checking the error's shape works regardless
 * of which instance created it.
 */
function isZodLikeError(err: unknown): err is ZodLikeError {
  return (
    err instanceof Error &&
    err.name === 'ZodError' &&
    Array.isArray((err as { issues?: unknown }).issues)
  );
}

/** Wraps an async route handler so rejected promises reach the error handler. */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Req, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `No route for ${req.method} ${req.path}.` },
  });
}

// Express identifies error-handling middleware by its 4-parameter arity, so `_next`
// must stay even though it's unused — the `^_` ignore pattern covers it.
/** Single error-formatting point for the whole API — see docs/API_SPEC.md §0. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (isZodLikeError(err)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request did not pass validation.',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // Unexpected error — log with full detail, never leak internals to the client.
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Something went wrong. Please try again.' : String(err),
    },
  });
}
