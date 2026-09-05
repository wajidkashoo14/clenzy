import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface RefundCompletedData {
  orderNumber: string;
  amount: number;
  webAppUrl: string;
}

export async function buildRefundCompletedNotification(
  data: RefundCompletedData,
): Promise<NotificationContent> {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  const amount = `₹${(data.amount / 100).toFixed(0)}`;
  return {
    inApp: {
      title: 'Refund completed',
      body: `${amount} has been refunded for order ${data.orderNumber}.`,
    },
    email: {
      subject: `Refund completed for order ${data.orderNumber}`,
      html: await render(
        <EmailLayout previewText="Your refund is complete" heading="Refund completed">
          <Text style={emailTextStyle}>
            {amount} has been refunded to your original payment method for order{' '}
            <strong>{data.orderNumber}</strong>.
          </Text>
          <Text style={emailTextStyle}>
            <a href={link}>View order</a>
          </Text>
        </EmailLayout>,
      ),
    },
    sms: {
      text: `Clenzy: ${amount} refunded for order ${data.orderNumber}.`,
      variables: { orderNumber: data.orderNumber, amount },
    },
  };
}
