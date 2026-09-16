import Link from 'next/link';
import type { ReactNode } from 'react';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { Stagger, StaggerItem } from '@/components/marketing/Stagger';
import { Card } from '@/components/ui/Card';
import { getCategories } from '@/lib/catalog-api';
import { formatRupees } from '@/lib/format';
import { renderIcon } from '@/lib/icons';

export async function ServicesGrid(): Promise<ReactNode> {
  const categories = await getCategories();

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <SectionHeading
        eyebrow="Services"
        title="Everything, one pickup away"
        description="From everyday laundry to delicate pashmina — pick a category to see exactly what’s included and what it costs."
      />

      <Stagger className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" step={0.06}>
        {categories.map((category) => (
          <StaggerItem key={category.slug} className="h-full">
            <Link href={`/services/${category.slug}`} className="group block h-full">
              <Card interactive padding="lg" className="h-full">
                <span className="from-primary-soft to-secondary-soft text-primary ring-primary/10 duration-base flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1 transition-transform ease-out group-hover:scale-110 group-hover:-rotate-3">
                  {renderIcon(category.icon, 'size-5')}
                </span>
                <h3 className="text-text duration-base group-hover:text-primary mt-4 text-base font-semibold transition-colors ease-out">
                  {category.name}
                </h3>
                <p className="text-text-muted mt-1.5 text-sm">{category.shortDescription}</p>
                <p className="text-primary mt-3 text-sm font-medium">
                  From{' '}
                  {category.startingPrice !== undefined && formatRupees(category.startingPrice)}
                  <span className="duration-base ml-1 inline-block transition-transform ease-out group-hover:translate-x-1">
                    →
                  </span>
                </p>
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
