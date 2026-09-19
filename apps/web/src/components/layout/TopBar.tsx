import { Clock, Mail, Phone } from 'lucide-react';
import type { ReactNode } from 'react';

export interface TopBarProps {
  phone: string;
  email: string;
  hours: string;
}

/**
 * Thin utility strip above the header — not sticky, so it scrolls away while
 * Header's own `sticky top-0` takes over. Moved the phone number here out of
 * Header so the main nav row stays uncluttered; see Header.tsx.
 */
export function TopBar({ phone, email, hours }: TopBarProps): ReactNode {
  return (
    <div className="bg-primary text-text-inverse hidden sm:block">
      <div className="mx-auto flex h-9 max-w-[1200px] items-center justify-between gap-4 px-4 text-xs sm:px-6 lg:px-8">
        <a
          href={`tel:${phone}`}
          className="duration-fast ease-standard flex items-center gap-1.5 transition-opacity hover:opacity-80"
        >
          <Phone className="size-3.5" aria-hidden="true" />
          {phone}
        </a>
        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-1.5 md:flex">
            <Clock className="size-3.5" aria-hidden="true" />
            {hours}
          </span>
          <a
            href={`mailto:${email}`}
            className="duration-fast ease-standard hidden items-center gap-1.5 transition-opacity hover:opacity-80 md:flex"
          >
            <Mail className="size-3.5" aria-hidden="true" />
            {email}
          </a>
        </div>
      </div>
    </div>
  );
}
