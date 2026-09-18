import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { brand } from '@/content/brand';

/**
 * Root-level fallback for URLs that don't match any route at all (e.g. a
 * mistyped path). Routes that resolve into the (marketing) group but call
 * `notFound()` themselves (invalid service/location slug) use
 * `(marketing)/not-found.tsx` instead, which has the full site chrome — this
 * one can't, since nothing matched a layout to render it into.
 */
export default function RootNotFound() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-20 text-center">
      <Link href="/" className="font-heading text-primary text-2xl font-semibold">
        {brand.name}
      </Link>
      <span className="bg-surface-alt text-text-muted mt-8 flex size-16 items-center justify-center rounded-full">
        <SearchX className="size-7" aria-hidden="true" />
      </span>
      <h1 className="font-heading text-text mt-6 text-3xl font-semibold sm:text-4xl">
        Page not found
      </h1>
      <p className="text-text-muted mt-3 max-w-md">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="bg-primary text-text-inverse duration-fast ease-standard mt-8 inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_92%,black)]"
      >
        Back to home
      </Link>
    </main>
  );
}
