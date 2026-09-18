'use client';

import { Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';

export const THEME_STORAGE_KEY = 'clenzy-theme';

type Theme = 'light' | 'dark';
type Listener = () => void;

// A minimal external store over `<html data-theme>` — reading it through
// useSyncExternalStore (rather than useState+useEffect) is what lets the
// server/client-mismatch snapshot below (`getServerSnapshot`) work without
// an effect that calls setState on mount, which the React Compiler's
// react-hooks/set-state-in-effect rule flags as a cascading-render risk.
const listeners = new Set<Listener>();

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

// SSR and the pre-hydration render both need the same value; the real theme
// (possibly 'dark') is applied to the DOM before hydration by the inline
// script in app/layout.tsx and picked up via getSnapshot on the client's
// very first post-hydration read.
function getServerSnapshot(): Theme {
  return 'light';
}

function subscribe(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function applyTheme(next: Theme): void {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Private mode etc. — theme still applies for this page view.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Light/dark switch. The actual theming is a token swap under
 * `<html data-theme="dark">` (styles/tokens.css), applied pre-hydration by
 * the inline script in app/layout.tsx — this component only toggles the
 * attribute and persists the choice. Renders the light icon during SSR, then
 * reads the real theme on mount (matching the pre-hydration script) so
 * there's no hydration mismatch and no flash.
 */
export function ThemeToggle({ className }: { className?: string }): ReactNode {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle(): void {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'text-text relative flex size-10 items-center justify-center rounded-full',
        'duration-base transition-[background-color,color,transform] ease-out',
        'hover:bg-surface-alt hover:text-text focus-visible:shadow-focus hover:scale-105',
        'focus-visible:outline-none active:scale-95',
        className,
      )}
    >
      <span className="relative block size-5">
        <Sun
          className={cn(
            'duration-slow ease-spring absolute inset-0 size-5 transition-[transform,opacity]',
            theme === 'dark' ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
          )}
          aria-hidden="true"
        />
        <Moon
          className={cn(
            'duration-slow ease-spring absolute inset-0 size-5 transition-[transform,opacity]',
            theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0',
          )}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}
