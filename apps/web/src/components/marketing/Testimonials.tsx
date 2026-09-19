import { Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { Stagger, StaggerItem } from '@/components/marketing/Stagger';
import { getTestimonials } from '@/lib/content-api';

/** Empty when no testimonials are marked active in the admin dashboard yet — see docs/PROJECT_REQUIREMENTS.md's rule against fabricated reviews presented as genuine, so this never falls back to placeholder quotes. */
export async function Testimonials(): Promise<ReactNode> {
  const testimonials = await getTestimonials();
  if (testimonials.length === 0) return null;

  return (
    <section className="border-border bg-surface-alt/50 border-y">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading eyebrow="What customers say" title="Real feedback from Srinagar" />

        <Stagger className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {testimonials.map((testimonial) => (
            <StaggerItem key={testimonial._id} className="h-full">
              <figure className="border-border bg-surface duration-base relative h-full rounded-xl border p-5 shadow-sm transition-[transform,box-shadow] ease-out hover:-translate-y-1 hover:shadow-lg">
                {/* Decorative oversized quote mark */}
                <span
                  className="font-heading text-accent/25 absolute top-2 right-4 text-6xl leading-none select-none"
                  aria-hidden="true"
                >
                  ”
                </span>
                <div className="text-accent flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={i < testimonial.rating ? 'size-3.5 fill-current' : 'size-3.5'}
                    />
                  ))}
                </div>
                <blockquote className="text-text mt-3 text-sm">“{testimonial.text}”</blockquote>
                <figcaption className="text-text-muted mt-3 text-[13px]">
                  {testimonial.name}
                  {testimonial.area ? ` — ${testimonial.area}` : ''}
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
