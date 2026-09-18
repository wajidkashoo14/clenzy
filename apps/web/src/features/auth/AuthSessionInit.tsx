'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

/** Renders nothing — restores the session (calls `/auth/me`) once on mount. */
export function AuthSessionInit(): null {
  const fetchMe = useAuthStore((state) => state.fetchMe);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  return null;
}
