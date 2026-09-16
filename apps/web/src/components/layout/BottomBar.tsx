'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useIsKeyboardOpen } from '@/hooks/useIsKeyboardOpen';
import { cn } from '@/lib/cn';

export interface BottomBarItem {
  label: string;
  href: string;
  /**
   * A pre-rendered icon element (e.g. `<Home className="size-5" aria-hidden="true" />`),
   * not a component reference — this crosses the Server→Client Component
   * boundary (this component is 'use client'), and only rendered elements
   * and plain data survive that; raw function/component references don't.
   */
  icon: ReactNode;
  badge?: number;
}

export interface BottomBarProps {
  items: BottomBarItem[];
  /** e.g. true on /checkout, where the sticky CTA bar owns the bottom of the screen. */
  hidden?: boolean;
}

/** Home · Services · Cart · Orders · Account — see docs/ACCESSIBILITY_AND_MOBILE.md §1. */
export function BottomBar({ items, hidden = false }: BottomBarProps): ReactNode {
  const pathname = usePathname();
  const keyboardOpen = useIsKeyboardOpen();

  if (hidden || keyboardOpen || pathname.startsWith('/checkout')) return null;

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'border-border bg-surface fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t',
        'pb-[env(safe-area-inset-bottom)] md:hidden',
      )}
    >
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
              'duration-fast ease-standard transition-colors',
              isActive ? 'text-primary' : 'text-text-muted',
            )}
          >
            <span className="relative">
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="bg-accent text-ink absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
                  aria-hidden="true"
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
