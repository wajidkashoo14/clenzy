'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { MessageCircle, Phone, X } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export interface NavLink {
  label: string;
  href: string;
}

export interface NavGroup {
  title: string;
  items: NavLink[];
}

export interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navGroups: NavGroup[];
  bookingHref: string;
  phone: string;
  whatsappHref: string;
  accountLinks: NavLink[];
}

/**
 * Right-side drawer — see docs/DESIGN_SYSTEM.md §5 "Mobile header". CSS
 * animation driven by Radix's `data-state`, not Framer's AnimatePresence —
 * see the comment in components/ui/Modal.tsx for why.
 */
export function MobileNav({
  open,
  onOpenChange,
  navGroups,
  bookingHref,
  phone,
  whatsappHref,
  accountLinks,
}: MobileNavProps): ReactNode {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-[rgba(32,33,30,0.45)]',
            'data-[state=open]:animate-[dialog-overlay-in_var(--duration-base)_var(--ease-standard)]',
            'data-[state=closed]:animate-[dialog-overlay-out_var(--duration-fast)_var(--ease-in)]',
          )}
        />

        <Dialog.Content
          className={cn(
            'bg-surface fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-sm flex-col overflow-y-auto shadow-lg',
            'data-[state=open]:animate-[drawer-in_var(--duration-slow)_var(--ease-out)]',
            'data-[state=closed]:animate-[drawer-out_var(--duration-fast)_var(--ease-in)]',
          )}
        >
          <div className="border-border flex items-center justify-between border-b p-4">
            <Dialog.Title className="text-text text-base font-semibold">Menu</Dialog.Title>
            <Dialog.Close
              aria-label="Close menu"
              className="text-text-muted duration-fast ease-standard hover:bg-surface-alt hover:text-text focus-visible:shadow-focus flex size-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none"
            >
              <X className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="p-4">
            <Button asChild size="lg" className="w-full">
              <Link href={bookingHref} onClick={() => onOpenChange(false)}>
                Book a pickup
              </Link>
            </Button>
          </div>

          <Accordion type="single" collapsible className="flex-1 px-4">
            {navGroups.map((group) => (
              <AccordionItem key={group.title} value={group.title}>
                <AccordionTrigger>{group.title}</AccordionTrigger>
                <AccordionContent>
                  <ul className="flex flex-col gap-3">
                    {group.items.map((item) => (
                      <li key={`${item.label}-${item.href}`}>
                        <Link
                          href={item.href}
                          onClick={() => onOpenChange(false)}
                          className="text-text-muted duration-fast hover:text-text block text-sm transition-colors"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="border-border flex flex-col gap-2 border-t p-4">
            {accountLinks.map((link) => (
              <Link
                key={`${link.label}-${link.href}`}
                href={link.href}
                onClick={() => onOpenChange(false)}
                className="text-text py-1.5 text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-2 flex gap-2">
              <a
                href={`tel:${phone}`}
                className="border-border-strong text-text duration-fast ease-standard hover:bg-surface-alt flex flex-1 items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-medium transition-colors"
              >
                <Phone className="size-4" aria-hidden="true" />
                Call
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border-strong text-text duration-fast ease-standard hover:bg-surface-alt flex flex-1 items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-medium transition-colors"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                WhatsApp
              </a>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
