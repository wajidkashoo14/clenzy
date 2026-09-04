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
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: ApiErrorDetail[] };
}

export async function toApiError(response: Response, fallbackMessage: string): Promise<ApiError> {
  try {
    const body = (await response.json()) as ErrorEnvelope;
    if (body.error) {
      return new ApiError(response.status, body.error.code, body.error.message, body.error.details);
    }
  } catch {
    // Response body wasn't the expected JSON error envelope — fall through.
  }
  return new ApiError(response.status, 'UNKNOWN_ERROR', fallbackMessage);
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

  return (await response.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await toApiError(response, `POST ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}
