'use client';

import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { Menu, Phone, ShoppingCart, User } from 'lucide-react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/cn';
import { transitions } from '@/lib/motion';
import type { NavGroup, NavLink } from './MobileNav';
import { MobileNav } from './MobileNav';

export interface HeaderNavItem {
  label: string;
  href?: string;
  /** Two-column mega-menu content, supplied by the page that has the real catalog data. */
  menuContent?: ReactNode;
}

export interface HeaderProps {
  logo: ReactNode;
  navItems: HeaderNavItem[];
  phone: string;
  whatsappHref: string;
  cartHref: string;
  cartCount?: number;
  accountHref: string;
  bookingHref: string;
  mobileNavGroups: NavGroup[];
  accountLinks: NavLink[];
  /** Starts transparent and solidifies after 40px of scroll — only pages with a hero should set this. */
  transparentAtTop?: boolean;
}

const SOLIDIFY_THRESHOLD_PX = 40;

/** See docs/DESIGN_SYSTEM.md §5 "Navigation" — desktop mega-menu + mobile drawer, one component. */
export function Header({
  logo,
  navItems,
  phone,
  whatsappHref,
  cartHref,
  cartCount = 0,
  accountHref,
  bookingHref,
  mobileNavGroups,
  accountLinks,
  transparentAtTop = false,
}: HeaderProps): ReactNode {
  const [isSolid, setIsSolid] = useState(!transparentAtTop);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { scrollY } = useScroll();
  const user = useAuthStore((state) => state.user);

  useMotionValueEvent(scrollY, 'change', (y) => {
    if (transparentAtTop) setIsSolid(y > SOLIDIFY_THRESHOLD_PX);
  });

  return (
    <>
      <motion.header
        animate={{
          backgroundColor: isSolid ? 'var(--color-surface)' : 'rgba(0,0,0,0)',
          borderBottomColor: isSolid ? 'var(--color-border)' : 'rgba(0,0,0,0)',
          boxShadow: isSolid ? 'var(--shadow-sm)' : '0 0 0 rgba(0,0,0,0)',
        }}
        transition={transitions.standard}
        className="sticky top-0 z-30 h-14 border-b lg:h-18"
      >
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="focus-visible:shadow-focus shrink-0 focus-visible:outline-none">
            {logo}
          </Link>

          <NavigationMenu.Root className="hidden lg:block" delayDuration={120}>
            <NavigationMenu.List className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavigationMenu.Item key={item.label}>
                  {item.menuContent ? (
                    <>
                      <NavigationMenu.Trigger
                        className={cn(
                          'text-text flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium',
                          'duration-fast ease-standard hover:bg-surface-alt transition-colors',
                          'focus-visible:shadow-focus focus-visible:outline-none',
                        )}
                      >
                        {item.label}
                      </NavigationMenu.Trigger>
                      <NavigationMenu.Content className="border-border bg-surface rounded-lg border p-5 shadow-lg">
                        {item.menuContent}
                      </NavigationMenu.Content>
                    </>
                  ) : (
                    <NavigationMenu.Link asChild>
                      <Link
                        href={item.href ?? '#'}
                        className={cn(
                          'text-text block rounded-md px-3 py-2 text-sm font-medium',
                          'duration-fast ease-standard hover:bg-surface-alt transition-colors',
                          'focus-visible:shadow-focus focus-visible:outline-none',
                        )}
                      >
                        {item.label}
                      </Link>
                    </NavigationMenu.Link>
                  )}
                </NavigationMenu.Item>
              ))}
            </NavigationMenu.List>
            <NavigationMenu.Viewport className="absolute left-0 mt-2 w-full" />
          </NavigationMenu.Root>

          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href={`tel:${phone}`}
              className="text-text-muted duration-fast ease-standard hover:text-text hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex"
            >
              <Phone className="size-4" aria-hidden="true" />
              {phone}
            </a>

            <Link
              href={cartHref}
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              className="text-text duration-fast ease-standard hover:bg-surface-alt focus-visible:shadow-focus relative flex size-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none"
            >
              <ShoppingCart className="size-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span
                  className="bg-accent text-text absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
                  aria-hidden="true"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href={user ? accountHref : '/login'}>
                <User className="size-4" aria-hidden="true" />
                {user ? (user.name ?? 'Account') : 'Account'}
              </Link>
            </Button>

            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link href={bookingHref}>Book a pickup</Link>
            </Button>

            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="text-text duration-fast ease-standard hover:bg-surface-alt focus-visible:shadow-focus flex size-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.header>

      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        navGroups={mobileNavGroups}
        bookingHref={bookingHref}
        phone={phone}
        whatsappHref={whatsappHref}
        accountLinks={accountLinks}
      />
    </>
  );
}
