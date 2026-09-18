import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { Container } from './Container';
import type { NavLink } from './MobileNav';

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export interface FooterOutlet {
  name: string;
  address: string;
}

export interface FooterProps {
  /** Services / Company / Support — see docs/DESIGN_SYSTEM.md §5 "Footer". */
  columns: FooterColumn[];
  outlets: FooterOutlet[];
  phone: string;
  whatsappHref: string;
  email: string;
  hours: string;
  socialLinks: NavLink[];
  legalLinks: NavLink[];
  gstNumber?: string;
  brandName: string;
}

/**
 * 2026 refresh: deep brand-ink footer with a gradient hairline on top and a
 * glow on the brand tile — the dark close contrasts the light page and makes
 * the CTA band above it feel intentional. All link styles live in this file
 * (its own LinkList/ContactDetails helpers) so the dark surface stays
 * self-contained.
 */
export function Footer({
  columns,
  outlets,
  phone,
  whatsappHref,
  email,
  hours,
  socialLinks,
  legalLinks,
  gstNumber,
  brandName,
}: FooterProps): ReactNode {
  return (
    <footer className="bg-ink text-on-ink">
      {/* Signature gradient hairline separating page from footer. */}
      <div
        className="from-primary via-secondary to-accent h-0.5 bg-gradient-to-r"
        aria-hidden="true"
      />
      {/* TODO(design): replace with the real chinar-vine line motif once the
          brand asset exists — see docs/DESIGN_SYSTEM.md §6. Placeholder: none,
          rather than fabricated brand artwork. */}
      <Container className="py-12 lg:py-16">
        {/* Desktop: four static columns */}
        <div className="hidden grid-cols-4 gap-8 lg:grid">
          {columns.map((column) => (
            <FooterColumnBlock key={column.title} column={column} />
          ))}
          <div>
            <p className="text-on-ink mb-3 text-sm font-semibold">Reach us</p>
            <ContactDetails
              outlets={outlets}
              phone={phone}
              whatsappHref={whatsappHref}
              email={email}
              hours={hours}
            />
          </div>
        </div>

        {/* Mobile/tablet: accordions, restyled for the dark surface */}
        <Accordion type="single" collapsible className="lg:hidden">
          {columns.map((column) => (
            <AccordionItem key={column.title} value={column.title} className="border-white/10">
              <AccordionTrigger className="text-on-ink hover:text-on-ink">
                {column.title}
              </AccordionTrigger>
              <AccordionContent className="text-on-ink/70">
                <LinkList links={column.links} />
              </AccordionContent>
            </AccordionItem>
          ))}
          <AccordionItem value="reach-us" className="border-white/10">
            <AccordionTrigger className="text-on-ink hover:text-on-ink">Reach us</AccordionTrigger>
            <AccordionContent className="text-on-ink/70">
              <ContactDetails
                outlets={outlets}
                phone={phone}
                whatsappHref={whatsappHref}
                email={email}
                hours={hours}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {socialLinks.length > 0 && (
          <div className="mt-8 flex gap-3 border-t border-white/10 pt-6 lg:mt-10">
            {socialLinks.map((link) => (
              <a
                key={`${link.label}-${link.href}`}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-ink/70 duration-base hover:text-on-ink inline-flex h-9 items-center rounded-full px-4 text-xs font-medium ring-1 ring-white/10 transition-[background-color,color,transform] ease-out hover:-translate-y-0.5 hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </Container>

      <div className="border-t border-white/10">
        <Container className="text-on-ink/50 flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {brandName}. All rights reserved.
            {gstNumber && <span className="ml-2">GSTIN: {gstNumber}</span>}
          </p>
          <LinkList links={legalLinks} inline />
        </Container>
      </div>
    </footer>
  );
}

function FooterColumnBlock({ column }: { column: FooterColumn }): ReactNode {
  return (
    <div>
      <p className="text-on-ink mb-3 text-sm font-semibold">{column.title}</p>
      <LinkList links={column.links} />
    </div>
  );
}

function LinkList({ links, inline = false }: { links: NavLink[]; inline?: boolean }): ReactNode {
  return (
    <ul className={inline ? 'flex flex-wrap gap-x-4 gap-y-1' : 'flex flex-col gap-2.5'}>
      {links.map((link) => (
        <li key={`${link.label}-${link.href}`}>
          <Link
            href={link.href}
            className="text-on-ink/60 duration-fast hover:text-on-ink transition-colors"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ContactDetails({
  outlets,
  phone,
  whatsappHref,
  email,
  hours,
}: {
  outlets: FooterOutlet[];
  phone: string;
  whatsappHref: string;
  email: string;
  hours: string;
}): ReactNode {
  return (
    <div className="text-on-ink/60 flex flex-col gap-3 text-sm">
      {outlets.map((outlet) => (
        <div key={outlet.name}>
          <p className="text-on-ink font-medium">{outlet.name}</p>
          <p>{outlet.address}</p>
        </div>
      ))}
      <a href={`tel:${phone}`} className="duration-fast hover:text-on-ink transition-colors">
        {phone}
      </a>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="duration-fast hover:text-on-ink transition-colors"
      >
        WhatsApp us
      </a>
      <a href={`mailto:${email}`} className="duration-fast hover:text-on-ink transition-colors">
        {email}
      </a>
      <p>{hours}</p>
    </div>
  );
}
