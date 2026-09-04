import type { Role } from '@clenzy/shared';
import { hasRole } from '@clenzy/shared';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/tokens.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- standard Express request-augmentation pattern.
  namespace Express {
    interface Request {
      /** Set by `requireAuth`. Only present on routes that declare it as middleware. */
      user?: { id: string; role: Role };
    }
  }
}

/**
 * Verifies the `clenzy_at` access-token cookie and attaches `req.user`.
 * Trusts the JWT's `role` claim without a DB lookup on every request — the
 * token is short-lived (15 min), so a role change takes at most that long to
 * take effect. See docs/SECURITY.md §2: every protected route must declare
 * this explicitly, there is no implicit inheritance from route prefix.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = (req.cookies as Record<string, string | undefined>)?.clenzy_at;
  if (!token) return next(AppError.unauthorized());

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(AppError.unauthorized('Session expired.'));
  }
}

/** Must run after `requireAuth`. See docs/SECURITY.md §2 — ownership checks are separate from this. */
export function requireRole(minimumRole: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized());
    if (!hasRole(req.user.role, minimumRole)) return next(AppError.forbidden());
    next();
  };
}
