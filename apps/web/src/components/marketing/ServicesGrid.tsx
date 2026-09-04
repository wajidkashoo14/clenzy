import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { getCategories } from '@/lib/catalog-api';
import { formatRupees } from '@/lib/format';
import { renderIcon } from '@/lib/icons';

export async function ServicesGrid(): Promise<ReactNode> {
  const categories = await getCategories();

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="max-w-xl">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">Services</p>
        <h2 className="font-heading text-text mt-2 text-3xl font-semibold">
          Everything, one pickup away
        </h2>
        <p className="text-text-muted mt-3">
          From everyday laundry to delicate pashmina — pick a category to see exactly what’s
          included and what it costs.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <Link key={category.slug} href={`/services/${category.slug}`} className="group block">
            <Card interactive padding="lg" className="h-full">
              <span className="bg-primary-soft text-primary flex size-11 items-center justify-center rounded-lg">
                {renderIcon(category.icon, 'size-5')}
              </span>
              <h3 className="text-text mt-4 text-base font-semibold">{category.name}</h3>
              <p className="text-text-muted mt-1.5 text-sm">{category.shortDescription}</p>
              <p className="text-primary mt-3 text-sm font-medium">
                From {category.startingPrice !== undefined && formatRupees(category.startingPrice)}
                <span className="duration-fast ease-standard ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
