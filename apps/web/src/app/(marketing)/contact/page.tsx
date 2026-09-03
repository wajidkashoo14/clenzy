import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Container } from '@/components/layout/Container';
import { ContactForm } from '@/components/marketing/ContactForm';
import { brand } from '@/content/brand';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Contact Us | ${brand.name}`,
  description: `Get in touch with ${brand.name} — call, WhatsApp, email, or visit one of our Srinagar outlets.`,
  path: '/contact',
});

export default function ContactPage() {
  const breadcrumbItems = [{ label: 'Home', href: '/' }, { label: 'Contact' }];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 max-w-2xl">
          <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">Contact us</h1>
          <p className="text-text-muted mt-3">
            Questions about an order, pricing, or coverage? We’re here to help.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-6">
            <a
              href={`tel:${brand.phone}`}
              className="border-border bg-surface duration-fast ease-standard hover:bg-surface-alt flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <span className="bg-primary-soft text-primary flex size-10 items-center justify-center rounded-full">
                <Phone className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-text text-sm font-medium">Call us</p>
                <p className="text-text-muted text-sm">{brand.phoneDisplay}</p>
              </div>
            </a>

            <a
              href={brand.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border bg-surface duration-fast ease-standard hover:bg-surface-alt flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <span className="bg-primary-soft text-primary flex size-10 items-center justify-center rounded-full">
                <MessageCircle className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-text text-sm font-medium">WhatsApp</p>
                <p className="text-text-muted text-sm">Usually replies within the hour</p>
              </div>
            </a>

            <a
              href={`mailto:${brand.email}`}
              className="border-border bg-surface duration-fast ease-standard hover:bg-surface-alt flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <span className="bg-primary-soft text-primary flex size-10 items-center justify-center rounded-full">
                <Mail className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-text text-sm font-medium">Email</p>
                <p className="text-text-muted text-sm">{brand.email}</p>
              </div>
            </a>

            <div>
              <p className="text-text text-sm font-semibold">Our outlets</p>
              <div className="mt-3 flex flex-col gap-3">
                {brand.outlets.map((outlet) => (
                  <div key={outlet.name} className="flex gap-3">
                    <MapPin
                      className="text-text-muted mt-0.5 size-4.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-text text-sm font-medium">{outlet.name}</p>
                      <p className="text-text-muted text-[13px]">{outlet.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-text-muted text-[13px]">{brand.supportHours}</p>
          </div>

          <div className="border-border bg-surface rounded-lg border p-6">
            <ContactForm />
          </div>
        </div>
      </Container>
    </>
  );
}
