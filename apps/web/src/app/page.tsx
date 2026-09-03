'use client';

import { useEffect, useState } from 'react';
import type { HealthResponse } from '@clenzy/shared';
import { ApiError, apiGet } from '@/lib/api-client';

type Status =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ok'; health: HealthResponse };

export default function Home() {
  const [status, setStatus] = useState<Status>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;

    apiGet<HealthResponse>('/api/v1/health')
      .then((health) => {
        if (!cancelled) setStatus({ state: 'ok', health });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.message
            : 'Could not reach the API. Is it running? (npm run dev:api)';
        setStatus({ state: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Clenzy</h1>
      <p className="text-sm text-neutral-500">Phase 1 scaffold — design system lands in Phase 2.</p>

      <div className="mt-4 rounded-lg border border-neutral-200 px-4 py-3 text-sm">
        {status.state === 'loading' && <span className="text-neutral-500">Checking API…</span>}
        {status.state === 'ok' && (
          <span className="text-green-700">
            API reachable — {status.health.service} (up {status.health.uptimeSeconds}s)
          </span>
        )}
        {status.state === 'error' && <span className="text-red-700">{status.message}</span>}
      </div>
    </main>
  );
}
