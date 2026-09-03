import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Container } from '@/components/layout/Container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { brand } from '@/content/brand';
import { SERVICE_CATEGORIES } from '@/content/services';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Laundry & Dry Cleaning Price List — Srinagar | ${brand.name}`,
  description:
    'Transparent, per-item pricing for laundry, dry cleaning, and home fabric care in Srinagar. No hidden charges.',
  path: '/pricing',
});

export default function PricingPage() {
  const breadcrumbItems = [{ label: 'Home', href: '/' }, { label: 'Pricing' }];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 max-w-2xl">
          <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">Price list</h1>
          <p className="text-text-muted mt-3">
            Every price, upfront. Final totals are confirmed after our team inspects your items at
            pickup.
          </p>
        </div>

        <Tabs defaultValue={SERVICE_CATEGORIES[0]?.slug} className="mt-8">
          <TabsList className="flex-wrap">
            {SERVICE_CATEGORIES.map((category) => (
              <TabsTrigger key={category.slug} value={category.slug}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {SERVICE_CATEGORIES.map((category) => (
            <TabsContent key={category.slug} value={category.slug}>
              <div className="border-border overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt">
                    <tr>
                      <th className="text-text px-4 py-3 text-left font-semibold">Item</th>
                      <th className="text-text px-4 py-3 text-right font-semibold">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.items.map((item, i) => (
                      <tr key={item.slug} className={i % 2 === 1 ? 'bg-surface-alt' : 'bg-surface'}>
                        <td className="text-text px-4 py-3">{item.name}</td>
                        <td className="text-text px-4 py-3 text-right font-medium tabular-nums">
                          ₹{item.priceRupees} <span className="text-text-muted">/ {item.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Container>
    </>
  );
}
