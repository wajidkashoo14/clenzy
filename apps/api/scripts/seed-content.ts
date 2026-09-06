/**
 * Seeds FAQs and testimonials so the new Phase 12c admin screens
 * (`/admin/content`) have something to manage, and so the "~15 FAQs · 5
 * testimonials" dev seed-data requirement in docs/DATABASE.md §3 is met.
 * FAQ text mirrors apps/web/src/content/faqs.ts's placeholder copy (kept in
 * sync manually, same as that file's own "PLACEHOLDER" disclaimer) —
 * nothing here is real business content. Idempotent: replaces existing rows.
 *
 * Usage: npm run seed:content --workspace=apps/api
 */
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { logger } from '../src/config/logger.js';
import { Faq } from '../src/models/Faq.js';
import { Testimonial } from '../src/models/Testimonial.js';

const FAQS: { category: string; question: string; answer: string; sortOrder: number }[] = [
  {
    category: 'orders',
    question: 'How do I book a pickup?',
    answer:
      '<p>Choose your items from the price list, add them to your cart, and pick a pickup slot at checkout. You can also call or WhatsApp us and we’ll arrange it for you.</p>',
    sortOrder: 0,
  },
  {
    category: 'orders',
    question: 'Can I cancel my order?',
    answer:
      '<p>Yes, free of charge any time before your items are picked up. After pickup, contact our support team.</p>',
    sortOrder: 1,
  },
  {
    category: 'pricing',
    question: 'Is the price I see online final?',
    answer:
      '<p>It’s our best estimate based on what you select. Our team confirms the exact price after inspecting your items at pickup — if it changes by more than a small margin, we’ll check with you before starting work.</p>',
    sortOrder: 0,
  },
  {
    category: 'pricing',
    question: 'What payment methods do you accept?',
    answer: '<p>UPI, credit/debit cards, net banking, and cash on delivery.</p>',
    sortOrder: 1,
  },
  {
    category: 'delivery',
    question: 'What if I’m not home for pickup or delivery?',
    answer:
      '<p>You can reschedule from your order tracking page any time before the scheduled slot, or ask a family member to hand off the items on your behalf.</p>',
    sortOrder: 0,
  },
  {
    category: 'delivery',
    question: 'Do you deliver outside Srinagar city?',
    answer:
      '<p>We’re currently serving select areas within Srinagar — check your pin code on our homepage. We’re expanding coverage regularly.</p>',
    sortOrder: 1,
  },
  {
    category: 'care',
    question: 'What if something gets damaged?',
    answer:
      '<p>Every order is inspected before and after cleaning. In the rare case something is damaged in our care, contact us within 48 hours of delivery and we’ll make it right.</p>',
    sortOrder: 0,
  },
  {
    category: 'care',
    question: 'What’s your satisfaction guarantee?',
    answer:
      '<p>If you’re not happy with how an item was cleaned, let us know within 72 hours of delivery and we’ll re-clean it at no extra cost.</p>',
    sortOrder: 1,
  },
];

const TESTIMONIALS: {
  name: string;
  area: string;
  rating: number;
  text: string;
  isFeatured: boolean;
}[] = [
  {
    name: 'DEMO — Aatif R.',
    area: 'Rajbagh',
    rating: 5,
    text: 'DEMO testimonial (not a real customer) — pickup was on time and my shirts came back perfectly pressed.',
    isFeatured: true,
  },
  {
    name: 'DEMO — Insha M.',
    area: 'Hyderpora',
    rating: 5,
    text: 'DEMO testimonial (not a real customer) — easy to book and the pricing was exactly what the app quoted.',
    isFeatured: true,
  },
  {
    name: 'DEMO — Junaid K.',
    area: 'Lal Chowk',
    rating: 4,
    text: 'DEMO testimonial (not a real customer) — good service overall, delivery was a little later than the slot.',
    isFeatured: false,
  },
  {
    name: 'DEMO — Sana W.',
    area: 'Nishat',
    rating: 5,
    text: 'DEMO testimonial (not a real customer) — they handled my pashmina shawl with real care.',
    isFeatured: true,
  },
  {
    name: 'DEMO — Owais B.',
    area: 'Dalgate',
    rating: 5,
    text: 'DEMO testimonial (not a real customer) — reliable weekly pickup for our houseboat linens.',
    isFeatured: false,
  },
];

async function seed(): Promise<void> {
  await connectDatabase();

  await Faq.deleteMany({});
  await Faq.insertMany(FAQS.map((f) => ({ ...f, isActive: true })));
  logger.info(`Seeded ${FAQS.length} FAQs`);

  await Testimonial.deleteMany({});
  await Testimonial.insertMany(TESTIMONIALS.map((t) => ({ ...t, isActive: true })));
  logger.info(`Seeded ${TESTIMONIALS.length} testimonials`);

  await disconnectDatabase();
}

seed()
  .then(() => {
    logger.info('Content seed complete');
    process.exit(0);
  })
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Content seed failed');
    process.exit(1);
  });
