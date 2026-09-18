import { NextResponse, type NextRequest } from 'next/server';

/**
 * Same-origin proxy for the whole `/api/v1/*` surface — same trick as the
 * sibling `app/api/auth/[...path]/route.ts`, extended to every other API
 * call (orders, cart, admin, etc.), not just auth. The browser only ever
 * talks to this app's own origin; this route forwards to the Express API
 * server-to-server and copies cookies both ways. That means it works
 * whether or not the web app and API share a registrable domain — no
 * custom domain required for auth to function in any environment.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const targetUrl = `${API_URL}/api/v1/${path.join('/')}${request.nextUrl.search}`;

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

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { path } = await params;
  return proxy(request, path);
}
