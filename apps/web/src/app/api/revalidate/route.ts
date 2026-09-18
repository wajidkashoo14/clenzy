import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * On-demand ISR revalidation webhook — see docs/ARCHITECTURE.md §6
 * ("on-demand revalidation triggered by the API when an admin edits the
 * catalog") and docs/DEVELOPMENT_PLAN.md Phase 5. Nothing calls this
 * automatically yet — the admin repricing flow that would trigger it lands
 * in Phase 12 — but the mechanism is real: every catalog fetch in
 * lib/catalog-api.ts is tagged `catalog`, so this immediately busts every
 * cached catalog page the moment it's called.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret =
    request.nextUrl.searchParams.get('secret') ?? request.headers.get('x-revalidate-secret');

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  // { expire: 0 } expires the tag immediately rather than serving
  // stale-while-revalidate — this is a webhook call, not a Server Action, so
  // `updateTag` (which would otherwise be preferred) isn't available here.
  // See node_modules/next/dist/docs/.../revalidateTag.md.
  revalidateTag('catalog', { expire: 0 });
  return NextResponse.json({
    success: true,
    data: { revalidated: true, at: new Date().toISOString() },
  });
}
