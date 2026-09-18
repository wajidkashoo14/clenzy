'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Header, type HeaderNavItem } from '@/components/layout/Header';
import type { NavGroup, NavLink } from '@/components/layout/MobileNav';

export interface MarketingChromeProps {
  logo: ReactNode;
  navItems: HeaderNavItem[];
  phone: string;
  whatsappHref: string;
  accountHref: string;
  bookingHref: string;
  mobileNavGroups: NavGroup[];
  accountLinks: NavLink[];
}

/**
 * Thin client wrapper so only the homepage gets the transparent-over-hero
 * header — Header itself stays route-agnostic. See docs/DESIGN_SYSTEM.md §5.
 */
export function MarketingChrome(props: MarketingChromeProps): ReactNode {
  const pathname = usePathname();
  return <Header {...props} transparentAtTop={pathname === '/'} />;
}
