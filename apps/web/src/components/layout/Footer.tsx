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
    <footer className="border-border bg-surface border-t">
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
            <p className="text-text mb-3 text-sm font-semibold">Reach us</p>
            <ContactDetails
              outlets={outlets}
              phone={phone}
              whatsappHref={whatsappHref}
              email={email}
              hours={hours}
            />
          </div>
        </div>

        {/* Mobile/tablet: accordions */}
        <Accordion type="single" collapsible className="lg:hidden">
          {columns.map((column) => (
            <AccordionItem key={column.title} value={column.title}>
              <AccordionTrigger>{column.title}</AccordionTrigger>
              <AccordionContent>
                <LinkList links={column.links} />
              </AccordionContent>
            </AccordionItem>
          ))}
          <AccordionItem value="reach-us">
            <AccordionTrigger>Reach us</AccordionTrigger>
            <AccordionContent>
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
          <div className="border-border mt-8 flex gap-4 border-t pt-6 lg:mt-10">
            {socialLinks.map((link) => (
              <a
                key={`${link.label}-${link.href}`}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted duration-fast hover:text-text text-sm transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </Container>

      <div className="border-border border-t">
        <Container className="text-text-muted flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
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
      <p className="text-text mb-3 text-sm font-semibold">{column.title}</p>
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
            className="text-text-muted duration-fast hover:text-text text-sm transition-colors"
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
    <div className="text-text-muted flex flex-col gap-3 text-sm">
      {outlets.map((outlet) => (
        <div key={outlet.name}>
          <p className="text-text font-medium">{outlet.name}</p>
          <p>{outlet.address}</p>
        </div>
      ))}
      <a href={`tel:${phone}`} className="duration-fast hover:text-text transition-colors">
        {phone}
      </a>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="duration-fast hover:text-text transition-colors"
      >
        WhatsApp us
      </a>
      <a href={`mailto:${email}`} className="duration-fast hover:text-text transition-colors">
        {email}
      </a>
      <p>{hours}</p>
    </div>
  );
}
