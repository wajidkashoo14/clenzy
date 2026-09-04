/**
 * Minimal typed fetch wrapper for the Clenzy API. Grows real functionality
 * (auth refresh, retries) as those land in later phases — see
 * docs/ARCHITECTURE.md §5 for the intended final shape.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/** Matches the error envelope shape in docs/API_SPEC.md §0. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ApiErrorDetail[],
    /** Extra machine-readable fields beyond code/message/details — e.g. `nearestServiceableAreas`, a `DUPLICATE_REQUEST` replay's `order`. */
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: ApiErrorDetail[]; [key: string]: unknown };
}

export async function toApiError(response: Response, fallbackMessage: string): Promise<ApiError> {
  try {
    const body = (await response.json()) as ErrorEnvelope;
    if (body.error) {
      const { code, message, details, ...extra } = body.error;
      return new ApiError(response.status, code, message, details, extra);
    }
  } catch {
    // Response body wasn't the expected JSON error envelope — fall through.
  }
  return new ApiError(response.status, 'UNKNOWN_ERROR', fallbackMessage);
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    throw await toApiError(response, `GET ${path} failed with ${response.status}`);
  }

  const body = (await response.json()) as SuccessEnvelope<T>;
  return body.data;
}

async function apiWithBody<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    method,
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await toApiError(response, `${method} ${path} failed with ${response.status}`);
  }

  const responseBody = (await response.json()) as SuccessEnvelope<T>;
  return responseBody.data;
}

export function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return apiWithBody('POST', path, body, init);
}

export function apiPatch<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return apiWithBody('PATCH', path, body, init);
}

export function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  return apiWithBody('DELETE', path, undefined, init);
}
