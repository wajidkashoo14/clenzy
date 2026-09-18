/** PLACEHOLDER FAQ content — matches docs/DATABASE.md's `faqs` shape for an easy Phase 5 swap. */
export interface Faq {
  question: string;
  answer: string;
  category: 'orders' | 'pricing' | 'delivery' | 'care';
}

export const FAQS: Faq[] = [
  {
    category: 'orders',
    question: 'How do I book a pickup?',
    answer:
      'Choose your items from the price list, add them to your cart, and pick a pickup slot at checkout. You can also call or WhatsApp us and we’ll arrange it for you.',
  },
  {
    category: 'pricing',
    question: 'Is the price I see online final?',
    answer:
      'It’s our best estimate based on what you select. Our team confirms the exact price after inspecting your items at pickup — if it changes by more than a small margin, we’ll check with you before starting work.',
  },
  {
    category: 'delivery',
    question: 'What if I’m not home for pickup or delivery?',
    answer:
      'You can reschedule from your order tracking page any time before the scheduled slot, or ask a family member to hand off the items on your behalf.',
  },
  {
    category: 'care',
    question: 'What if something gets damaged?',
    answer:
      'Every order is inspected before and after cleaning. In the rare case something is damaged in our care, contact us within 48 hours of delivery and we’ll make it right.',
  },
  {
    category: 'orders',
    question: 'Can I cancel my order?',
    answer:
      'Yes, free of charge any time before your items are picked up. After pickup, contact our support team.',
  },
  {
    category: 'delivery',
    question: 'Do you deliver outside Srinagar city?',
    answer:
      'We’re currently serving select areas within Srinagar — check your pin code on our homepage. We’re expanding coverage regularly.',
  },
  {
    category: 'pricing',
    question: 'What payment methods do you accept?',
    answer: 'UPI, credit/debit cards, net banking, and cash on delivery.',
  },
  {
    category: 'care',
    question: 'Are you happy with the guarantee if I’m not satisfied?',
    answer:
      'If you’re not happy with how an item was cleaned, let us know within 72 hours of delivery and we’ll re-clean it at no extra cost.',
  },
];
