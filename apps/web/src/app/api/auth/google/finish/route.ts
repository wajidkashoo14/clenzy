import { NextResponse, type NextRequest } from 'next/server';

/**
 * Google's callback lands on the API directly (a real top-level redirect —
 * see LoginForm.tsx), so the cookies it issues would land on the API's own
 * domain, not this app's. The API redirects here with a short-lived one-time
 * code instead of setting cookies itself; exchanging that code here sets the
 * same cookies as a first-party response from this app's own origin, exactly
 * like app/api/auth/[...path]/route.ts does for every other auth call. See
 * apps/api/src/controllers/auth.controller.ts googleCallback/googleExchange.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/login?authError=google_failed', request.url));
  }

  const apiResponse = await fetch(`${API_URL}/api/v1/auth/google/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!apiResponse.ok) {
    return NextResponse.redirect(new URL('/login?authError=google_failed', request.url));
  }

  const response = NextResponse.redirect(new URL('/account', request.url));
  for (const setCookie of apiResponse.headers.getSetCookie()) {
    response.headers.append('Set-Cookie', setCookie);
  }
  return response;
}
