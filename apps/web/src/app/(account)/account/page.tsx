'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { logout } from '@/features/auth/api';
import { useAuthStore } from '@/stores/authStore';

/**
 * Placeholder — proves the auth + protected-route mechanism end to end
 * (middleware gate, session restore, logout). The real customer dashboard
 * (orders, addresses, profile) is a later phase.
 */
export default function AccountPage() {
  const router = useRouter();
  const { user, status, clear } = useAuthStore();

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } finally {
      // Clear local state regardless of whether the server-side revoke
      // succeeded (e.g. an already-expired access token) — the user should
      // never feel stuck logged in when they clicked "Log out".
      clear();
      router.push('/');
    }
  }

  if (status === 'loading') {
    return <p className="text-text-muted">Loading…</p>;
  }

  if (!user) {
    // Middleware should already have redirected unauthenticated visitors to
    // /login — this only shows if the session expired after the page loaded.
    return <p className="text-text-muted">Your session has expired. Please log in again.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-text text-2xl font-semibold">
          {user.name ? `Hi, ${user.name}` : 'Your account'}
        </h1>
        <p className="text-text-muted mt-1 text-sm">
          {user.phone} · {user.role}
        </p>
      </div>

      <Button variant="secondary" className="self-start" onClick={() => void handleLogout()}>
        Log out
      </Button>
    </div>
  );
}
