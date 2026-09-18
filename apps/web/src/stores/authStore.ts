import type { AuthUser } from '@clenzy/shared';
import { create } from 'zustand';
import { getMe, refreshSession } from '@/features/auth/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  setUser: (user: AuthUser) => void;
  clear: () => void;
  /** Session restore — call once on app mount. Safe to call more than once. */
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  setUser: (user) => set({ user, status: 'authenticated' }),
  clear: () => set({ user: null, status: 'unauthenticated' }),
  fetchMe: async () => {
    try {
      const { user } = await getMe();
      set({ user, status: 'authenticated' });
      return;
    } catch {
      // Access token cookie may just be expired (15-minute lifetime) while
      // the 30-day refresh token is still good — try rotating once before
      // giving up. This is the "sessions survive refresh" mechanism.
    }

    try {
      await refreshSession();
      const { user } = await getMe();
      set({ user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },
}));
