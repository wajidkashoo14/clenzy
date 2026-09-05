import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';

export interface ReviewRequestData {
  orderNumber: string;
}

/** One email only, 24h after delivery — see PAYMENTS_AND_NOTIFICATIONS.md §3.2 "Never nag". */
export async function buildReviewRequestNotification(
  data: ReviewRequestData,
): Promise<NotificationContent> {
  return {
    inApp: {
      title: 'How was your order?',
      body: `Tell us how order ${data.orderNumber} went.`,
    },
    email: {
      subject: 'How was your Clenzy order?',
      html: await render(
        <EmailLayout previewText="Tell us how we did" heading="How did we do?">
          <Text style={emailTextStyle}>
            We hope order <strong>{data.orderNumber}</strong> arrived just right. A quick review
            helps us — and other customers in Srinagar — a lot.
          </Text>
        </EmailLayout>,
      ),
    },
  };
}
