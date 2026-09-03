import type { NextFunction, Request, Response } from 'express';

/**
 * Strips keys starting with "$" or containing "." from request input, which
 * blocks the classic NoSQL-injection pattern (e.g. `{"$ne": null}` as a
 * field value). This is defense-in-depth — Zod validation on every route is
 * the primary control, since a correctly-typed schema never lets an object
 * reach a query in the first place. See docs/SECURITY.md §4.
 *
 * Implemented by hand rather than via the `express-mongo-sanitize` package:
 * that package reassigns `req.query`, which Express 5 made a getter-only
 * property (query is parsed lazily and cached), so it throws on every
 * request. This middleware mutates objects in place instead, which is legal
 * for `req.body` and `req.params` (plain writable properties) and for the
 * contents of `req.query` (the object itself can't be replaced, but its keys
 * can be).
 */
function sanitizeInPlace(value: unknown): void {
  if (value === null || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete record[key];
      continue;
    }
    sanitizeInPlace(record[key]);
  }
}

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
  sanitizeInPlace(req.body);
  sanitizeInPlace(req.params);
  sanitizeInPlace(req.query);
  next();
}
