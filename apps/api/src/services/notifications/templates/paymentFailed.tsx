import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface PaymentFailedData {
  orderNumber: string;
  webAppUrl: string;
}

export async function buildPaymentFailedNotification(
  data: PaymentFailedData,
): Promise<NotificationContent> {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  return {
    inApp: {
      title: 'Payment failed',
      body: `Your payment for order ${data.orderNumber} didn't go through. Retry to confirm it.`,
    },
    email: {
      subject: `Payment failed for order ${data.orderNumber}`,
      html: await render(
        <EmailLayout previewText="Payment did not go through" heading="Payment failed">
          <Text style={emailTextStyle}>
            Your payment for order <strong>{data.orderNumber}</strong> didn&rsquo;t go through. Your
            items haven&rsquo;t been picked up yet — retry the payment to confirm the order.
          </Text>
          <Text style={emailTextStyle}>
            <a href={link}>Retry payment</a>
          </Text>
        </EmailLayout>,
      ),
    },
    sms: {
      text: `Clenzy: Payment failed for order ${data.orderNumber}. Retry here: ${link}`,
      variables: { orderNumber: data.orderNumber, link },
    },
  };
}
