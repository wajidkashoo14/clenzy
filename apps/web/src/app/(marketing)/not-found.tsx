import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';

/**
 * Catches `notFound()` calls from within the (marketing) route group — e.g. an
 * invalid /services/[slug] or /locations/[area] — and renders with the full
 * marketing chrome (header/footer/bottom bar) from this group's layout.
 */
export default function MarketingNotFound() {
  return (
    <Container className="flex flex-col items-center py-20 text-center lg:py-32">
      <span className="bg-surface-alt text-text-muted flex size-16 items-center justify-center rounded-full">
        <SearchX className="size-7" aria-hidden="true" />
      </span>
      <h1 className="font-heading text-text mt-6 text-3xl font-semibold sm:text-4xl">
        Page not found
      </h1>
      <p className="text-text-muted mt-3 max-w-md">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/services">Browse services</Link>
        </Button>
      </div>
    </Container>
  );
}
