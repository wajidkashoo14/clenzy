import { Home, Package, ShoppingCart, Sparkles, User as UserIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { BottomBar } from '@/components/layout/BottomBar';
import { Footer } from '@/components/layout/Footer';
import { MarketingChrome } from '@/components/layout/MarketingChrome';
import { ServicesMegaMenu } from '@/components/marketing/ServicesMegaMenu';
import { Toaster } from '@/components/ui/Toast';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { BrandMark } from '@/components/layout/BrandMark';
import { brand } from '@/content/brand';
import { SERVICE_CATEGORIES } from '@/content/services';
import { AuthSessionInit } from '@/features/auth/AuthSessionInit';
import { CartDrawer } from '@/features/cart/CartDrawer';
import { CartEstimateSync } from '@/features/cart/CartEstimateSync';

const NAV_ITEMS = [
  { label: 'Services', menuContent: <ServicesMegaMenu /> },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Locations', href: '/locations' },
  { label: 'Business', href: '/business' },
];

const MOBILE_NAV_GROUPS = [
  {
    title: 'Services',
    items: SERVICE_CATEGORIES.map((category) => ({
      label: category.name,
      href: `/services/${category.slug}`,
    })),
  },
  {
    title: 'Company',
    items: [
      { label: 'About us', href: '/about' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'For business', href: '/business' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Locations', href: '/locations' },
    ],
  },
];

const ACCOUNT_LINKS = [
  { label: 'My account', href: '/account' },
  { label: 'Log in', href: '/login' },
];

const FOOTER_COLUMNS = [
  {
    title: 'Services',
    links: SERVICE_CATEGORIES.map((category) => ({
      label: category.name,
      href: `/services/${category.slug}`,
    })),
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '/about' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'For business', href: '/business' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Offers', href: '/offers' },
    ],
  },
];

const LEGAL_LINKS = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Refund & Cancellation', href: '/refund-policy' },
  { label: 'Delivery Policy', href: '/delivery-policy' },
];

// Icons are rendered here (a Server Component) rather than passed as bare
// component references — BottomBar is a Client Component, and only
// serializable data / pre-rendered elements survive that boundary, not raw
// function references. See components/layout/BottomBar.tsx.
const BOTTOM_BAR_ITEMS = [
  { label: 'Home', href: '/', icon: <Home className="size-5" aria-hidden="true" /> },
  {
    label: 'Services',
    href: '/services',
    icon: <Sparkles className="size-5" aria-hidden="true" />,
  },
  { label: 'Cart', href: '/cart', icon: <ShoppingCart className="size-5" aria-hidden="true" /> },
  {
    label: 'Orders',
    href: '/account/orders',
    icon: <Package className="size-5" aria-hidden="true" />,
  },
  { label: 'Account', href: '/account', icon: <UserIcon className="size-5" aria-hidden="true" /> },
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <AuthSessionInit />
      <CartEstimateSync />
      <Toaster />
      <CartDrawer />

      <MarketingChrome
        logo={<BrandMark />}
        navItems={NAV_ITEMS}
        phone={brand.phone}
        whatsappHref={brand.whatsappHref}
        accountHref="/account"
        bookingHref="/book"
        mobileNavGroups={MOBILE_NAV_GROUPS}
        accountLinks={ACCOUNT_LINKS}
      />

      <main className="flex-1 pb-16 lg:pb-0">{children}</main>

      <Footer
        brandName={brand.name}
        columns={FOOTER_COLUMNS}
        outlets={brand.outlets}
        phone={brand.phone}
        whatsappHref={brand.whatsappHref}
        email={brand.email}
        hours={brand.supportHours}
        socialLinks={brand.social}
        legalLinks={LEGAL_LINKS}
        gstNumber={brand.gstNumber}
      />

      <BottomBar items={BOTTOM_BAR_ITEMS} />
    </TooltipProvider>
  );
}
