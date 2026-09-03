/**
 * PLACEHOLDER — every value here is fake and must be replaced with real
 * business information before launch (see docs/PROJECT_REQUIREMENTS.md §7
 * and docs/DEVELOPMENT_PLAN.md Phase 0). Nothing here should be trusted as
 * an actual claim about the business.
 */
// Not `as const`: nested arrays (outlets, social) need to stay assignable to
// the mutable array prop types Footer/MobileNav expect (FooterOutlet[], NavLink[]).
export const brand = {
  name: 'Clenzy',
  tagline: 'Premium fabric care, Srinagar',
  description:
    'Doorstep laundry, dry-cleaning, and home fabric care in Srinagar — transparent pricing, careful handling, no surprises.',
  phone: '+91 90000 00000',
  phoneDisplay: '+91 90000 00000',
  whatsappHref: 'https://wa.me/919000000000',
  email: 'hello@clenzy.in',
  supportHours: 'Mon–Sat, 9:00 AM – 8:00 PM',
  gstNumber: undefined as string | undefined,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  social: [{ label: 'Instagram', href: 'https://instagram.com/clenzy.in' }],
  outlets: [
    {
      name: 'Clenzy — Rajbagh',
      address: 'Near Amira Kadal, Rajbagh, Srinagar, J&K 190008',
      phone: '+91 90000 00000',
    },
    {
      name: 'Clenzy — Lal Chowk',
      address: 'Residency Road, Lal Chowk, Srinagar, J&K 190001',
      phone: '+91 90000 00000',
    },
  ],
};
