import { Droplets } from 'lucide-react';
import type { ReactNode } from 'react';
import { brand } from '@/content/brand';
import { cn } from '@/lib/cn';

/**
 * Brand lockup — a gradient droplet tile plus the wordmark. Shared by every
 * shell (marketing header, account, agent, auth) so the logo is identical
 * everywhere; tiles get a subtle glow so the mark sits nicely on both light
 * and dark surfaces.
 */
export function BrandMark({ className }: { className?: string }): ReactNode {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="from-primary to-secondary text-text-inverse shadow-glow flex size-8 items-center justify-center rounded-xl bg-gradient-to-br">
        <Droplets className="size-4.5" aria-hidden="true" />
      </span>
      <span className="font-heading text-primary text-xl font-semibold tracking-tight">
        {brand.name}
      </span>
    </span>
  );
}
