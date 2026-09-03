import { useSyncExternalStore } from 'react';

/**
 * SSR-safe media query hook. Returns `false` on the server and on first
 * client render (matching most mobile-first designs' default), then syncs
 * to the real value after hydration.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
