import { NextResponse, type NextRequest } from 'next/server';

/**
 * Same-origin proxy for every `/auth/*` call — see docs/ARCHITECTURE.md §4
 * ("app/api/ — ONLY: auth cookie proxy...") and docs/DEVELOPMENT_PLAN.md
 * Phase 4 ("the Next.js refresh proxy"). The browser only ever talks to this
 * app's own origin; this route forwards the request to the Express API
 * server-to-server and copies `Set-Cookie` headers back verbatim. That means
 * `clenzy_at`/`clenzy_rt` are always set as first-party cookies from the
 * browser's point of view, regardless of whether the API ends up on the same
 * apex domain as the web app in a given environment — no cross-site cookie
 * behavior to reason about, in dev or prod.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const targetUrl = `${API_URL}/api/v1/auth/${path.join('/')}${request.nextUrl.search}`;

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const apiResponse = await fetch(targetUrl, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: request.headers.get('cookie') ?? '',
    },
    body: hasBody ? await request.text() : undefined,
  });

  const response = new NextResponse(apiResponse.body, {
    status: apiResponse.status,
    headers: { 'Content-Type': apiResponse.headers.get('content-type') ?? 'application/json' },
  });

  for (const setCookie of apiResponse.headers.getSetCookie()) {
    response.headers.append('Set-Cookie', setCookie);
  }

  return response;
}

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { path } = await params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { path } = await params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { path } = await params;
  return proxy(request, path);
}
