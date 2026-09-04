import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';
import { getCategories, getCategoryBySlug } from '@/lib/catalog-api';
import { formatRupees } from '@/lib/format';
import { renderIcon } from '@/lib/icons';
import { breadcrumbJsonLd, buildMetadata, JsonLd, serviceJsonLd } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  return buildMetadata({
    title: `${category.name} in Srinagar | ${brand.name}`,
    description: `${category.description} Free doorstep pickup and delivery in Srinagar.`,
    path: `/services/${category.slug}`,
  });
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const items = category.items ?? [];
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: category.name },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <JsonLd
        data={serviceJsonLd({
          name: category.name,
          description: category.description,
          path: `/services/${category.slug}`,
          offers: items.map((item) => ({ name: item.name, priceRupees: item.price / 100 })),
        })}
      />

      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 flex items-start gap-4">
          <span className="bg-primary-soft text-primary flex size-14 shrink-0 items-center justify-center rounded-xl">
            {renderIcon(category.icon, 'size-6')}
          </span>
          <div>
            <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">
              {category.name}
            </h1>
            <p className="text-text-muted mt-2 max-w-xl">{category.description}</p>
          </div>
        </div>

        <div className="text-text-muted mt-6 flex flex-wrap gap-3 text-sm">
          <span className="bg-surface-alt rounded-full px-3 py-1.5">
            {category.turnaroundHours}h standard turnaround
          </span>
          {category.expressAvailable && (
            <span className="bg-accent-soft rounded-full px-3 py-1.5 text-[color-mix(in_srgb,var(--color-accent)_65%,black)]">
              Express available
            </span>
          )}
        </div>

        <div className="border-border mt-10 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt">
              <tr>
                <th className="text-text px-4 py-3 text-left font-semibold">Item</th>
                <th className="text-text px-4 py-3 text-right font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.slug} className={i % 2 === 1 ? 'bg-surface-alt' : 'bg-surface'}>
                  <td className="text-text px-4 py-3">
                    {item.name}
                    {item.careNote && (
                      <span className="text-text-muted block text-[13px]">{item.careNote}</span>
                    )}
                  </td>
                  <td className="text-text px-4 py-3 text-right font-medium tabular-nums">
                    {formatRupees(item.price)}
                    <span className="text-text-muted ml-1">/ {item.unit}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-text-muted mt-4 text-[13px]">
          Prices shown are estimates. Our team confirms the exact total after inspecting your items
          at pickup — see our{' '}
          <Link href="/faq" className="hover:text-text underline">
            FAQ
          </Link>{' '}
          for details.
        </p>

        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/book">Book a pickup</Link>
          </Button>
        </div>
      </Container>
    </>
  );
}
