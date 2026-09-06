import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * See docs/ARCHITECTURE.md §6 and apps/web/src/app/api/revalidate/route.ts —
 * "on-demand revalidation triggered by the API when an admin edits the
 * catalog." Fire-and-forget: a failed revalidation just leaves cached
 * catalog pages stale until their normal TTL, never worth failing the
 * admin's actual write over.
 */
export function triggerCatalogRevalidation(): void {
  if (!env.REVALIDATE_SECRET) return;

  fetch(`${env.WEB_APP_URL}/api/revalidate`, {
    method: 'POST',
    headers: { 'x-revalidate-secret': env.REVALIDATE_SECRET, 'Content-Type': 'application/json' },
  }).catch((err: unknown) => {
    logger.error({ err }, 'Catalog revalidation webhook call failed');
  });
}
