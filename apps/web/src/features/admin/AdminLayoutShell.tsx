'use client';

import { hasRole } from '@clenzy/shared';
import {
  CalendarClock,
  CalendarRange,
  ChevronLeft,
  IndianRupee,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  Shirt,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { brand } from '@/content/brand';
import { logout } from '@/features/auth/api';
import { AuthSessionInit } from '@/features/auth/AuthSessionInit';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: Package },
  { href: '/admin/orders/roster', label: "Today's Roster", icon: CalendarClock },
  { href: '/admin/services', label: 'Categories', icon: Shirt },
  { href: '/admin/services/items', label: 'Items', icon: ListChecks },
  { href: '/admin/pricing', label: 'Pricing', icon: IndianRupee },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/areas', label: 'Service Areas', icon: MapPin },
  { href: '/admin/slots', label: 'Slots', icon: CalendarRange },
  { href: '/admin/staff', label: 'Staff', icon: Users },
];

/**
 * Several routes share a prefix with a sibling nav entry (`/admin/orders` vs
 * `/admin/orders/roster`, `/admin/services` vs `/admin/services/items`), so
 * a plain `startsWith` would light up both. Only the longest matching href
 * — the most specific one — counts as active.
 */
function findActiveHref(pathname: string): string {
  let best = '';
  for (const item of NAV_ITEMS) {
    const matches =
      item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
    if (matches && item.href.length > best.length) best = item.href;
  }
  return best;
}

function NavLinks({
  collapsed,
  pathname,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}): ReactNode {
  const activeHref = findActiveHref(pathname);
  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === activeHref;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium',
              'duration-fast ease-standard transition-colors',
              isActive
                ? 'bg-primary-soft text-primary'
                : 'text-text-muted hover:bg-surface-alt hover:text-text',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Sidebar + top bar chrome for /admin, see docs/ADMIN_DASHBOARD.md §1. Only
 * Dashboard/Orders/Roster are wired up (Phase 12a) — the rest of the
 * documented sidebar (Customers, Catalog, Coupons, Areas, Slots, Staff,
 * Reviews, Leads, Content, Reports, Settings) is Phase 12b/12c, so it isn't
 * rendered here yet rather than linking to pages that don't exist.
 *
 * Sidebar is a fixed column on desktop (≥md) and a slide-in drawer on mobile
 * — docs/ADMIN_DASHBOARD.md §1 requires orders/roster to work on phones, so a
 * permanently-docked 240px sidebar isn't an option below that breakpoint.
 */
export function AdminLayoutShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, clear } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Global search shortcut — docs/ADMIN_DASHBOARD.md §1: "bind it to `/`".
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } finally {
      clear();
      router.push('/admin/login');
    }
  }

  function handleSearchSubmit(e: FormEvent): void {
    e.preventDefault();
    const query = search.trim();
    if (query) router.push(`/admin/orders?q=${encodeURIComponent(query)}`);
  }

  const isAllowed = status !== 'loading' && user && hasRole(user.role, 'staff');

  return (
    <>
      <AuthSessionInit />
      {status === 'loading' && (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-text-muted text-sm">Loading…</p>
        </div>
      )}

      {status !== 'loading' && !isAllowed && (
        <div className="flex min-h-screen items-center justify-center px-4">
          <p className="text-text-muted max-w-sm text-center text-sm">
            {user
              ? 'This area is only available to staff accounts.'
              : 'Please sign in with a staff, admin, or superadmin account.'}
          </p>
        </div>
      )}

      {isAllowed && (
        <div className="flex h-screen overflow-hidden">
          {/* Desktop sidebar */}
          <aside
            className={cn(
              'border-border bg-surface hidden shrink-0 flex-col overflow-y-auto border-r transition-[width] duration-150 md:flex',
              collapsed ? 'w-16' : 'w-60',
            )}
          >
            <div className="border-border flex h-14 items-center justify-between border-b px-3">
              {!collapsed && (
                <Link
                  href="/admin"
                  className="font-heading text-primary truncate text-base font-semibold"
                >
                  {brand.name} Admin
                </Link>
              )}
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="text-text-muted hover:bg-surface-alt hover:text-text flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
              >
                {collapsed ? (
                  <Menu className="size-4" aria-hidden="true" />
                ) : (
                  <ChevronLeft className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <NavLinks collapsed={collapsed} pathname={pathname} />
          </aside>

          {/* Mobile drawer */}
          {mobileNavOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <div
                className="absolute inset-0 bg-[rgba(32,33,30,0.45)]"
                onClick={() => setMobileNavOpen(false)}
                aria-hidden="true"
              />
              <aside className="border-border bg-surface absolute inset-y-0 left-0 flex w-64 flex-col overflow-y-auto border-r">
                <div className="border-border flex h-14 items-center justify-between border-b px-3">
                  <Link
                    href="/admin"
                    className="font-heading text-primary truncate text-base font-semibold"
                  >
                    {brand.name} Admin
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    aria-label="Close menu"
                    className="text-text-muted hover:bg-surface-alt hover:text-text flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <NavLinks
                  collapsed={false}
                  pathname={pathname}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              </aside>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="border-border bg-surface z-10 flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-4 sm:px-4">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
                className="text-text-muted hover:bg-surface-alt hover:text-text flex size-9 shrink-0 items-center justify-center rounded-md transition-colors md:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>

              <form onSubmit={handleSearchSubmit} className="max-w-md min-w-0 flex-1">
                <div className="relative">
                  <Search
                    className="text-text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search orders…  (press /)"
                    aria-label="Search orders"
                    className={cn(
                      'border-border-strong bg-surface-alt text-text h-9 w-full rounded-md border pr-3 pl-9 text-sm',
                      'placeholder:text-text-muted',
                      'focus-visible:border-primary focus-visible:shadow-focus focus-visible:outline-none',
                    )}
                  />
                </div>
              </form>

              <div className="ml-auto flex shrink-0 items-center gap-3">
                <span className="text-text-muted hidden text-sm lg:inline">
                  {user.name ?? user.phone} · <span className="capitalize">{user.role}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  aria-label="Log out"
                  className="text-text-muted hover:bg-surface-alt hover:text-text flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </div>
            </header>

            <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
          </div>
        </div>
      )}
    </>
  );
}
