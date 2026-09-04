import { NextResponse, type NextRequest } from 'next/server';

/**
 * Presence-only gate — checks for the `clenzy_rt` refresh-token cookie, not
 * its validity. Real authorization always happens server-side on the API
 * (see docs/SECURITY.md §2: "The UI hiding a button is not authorization").
 * This just avoids flashing protected content before a client-side redirect
 * would otherwise kick in, and covers direct/bookmarked navigation.
 *
 * Deliberately doesn't verify the JWT itself: a missing/expired access token
 * with a still-valid refresh token is let through — the client-side fetch
 * layer refreshes transparently via `/api/auth/refresh` (see
 * stores/authStore.ts `fetchMe`). Named `proxy` (not `middleware`) per
 * Next.js 16 — see node_modules/next/dist/docs/.../proxy.md.
 */
export function proxy(request: NextRequest): NextResponse {
  const hasRefreshToken = request.cookies.has('clenzy_rt');

  if (!hasRefreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/checkout/:path*'],
};
