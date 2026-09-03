/**
 * Minimal typed fetch wrapper for the Clenzy API. Grows real functionality
 * (auth refresh, error envelope handling, retries) as those land in later
 * phases — see docs/ARCHITECTURE.md §5 for the intended final shape.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}
