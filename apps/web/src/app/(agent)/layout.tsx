'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { brand } from '@/content/brand';
import { logout } from '@/features/auth/api';
import { AuthSessionInit } from '@/features/auth/AuthSessionInit';
import { useAuthStore } from '@/stores/authStore';

/**
 * Minimal, mobile-first chrome for the agent task view — deliberately not
 * the marketing header/footer/bottom-nav (agents are on the move between
 * stops, not browsing the site). See docs/DEVELOPMENT_PLAN.md Phase 9.
 */
export default function AgentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, status, clear } = useAuthStore();

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } finally {
      clear();
      router.push('/admin/login');
    }
  }

  return (
    <>
      <AuthSessionInit />
      <header className="border-border bg-surface sticky top-0 z-10 border-b">
        <Container className="flex h-14 items-center justify-between">
          <span className="font-heading text-primary text-lg font-semibold">
            {brand.name} Agent
          </span>
          {user && (
            <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
              Log out
            </Button>
          )}
        </Container>
      </header>
      <main className="flex-1">
        <Container className="max-w-xl py-6">
          {status === 'loading' && <p className="text-text-muted text-center">Loading…</p>}
          {status !== 'loading' && !user && (
            <p className="text-text-muted text-center">
              Please sign in as an agent to see your tasks.
            </p>
          )}
          {status !== 'loading' && user && user.role !== 'agent' && (
            <p className="text-text-muted text-center">
              This view is only available to agent accounts.
            </p>
          )}
          {status !== 'loading' && user?.role === 'agent' && children}
        </Container>
      </main>
    </>
  );
}
