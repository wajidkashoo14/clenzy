import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface RefundInitiatedData {
  orderNumber: string;
  amount: number;
  webAppUrl: string;
}

export async function buildRefundInitiatedNotification(
  data: RefundInitiatedData,
): Promise<NotificationContent> {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  const amount = `₹${(data.amount / 100).toFixed(0)}`;
  return {
    inApp: {
      title: 'Refund initiated',
      body: `A refund of ${amount} for order ${data.orderNumber} has been initiated.`,
    },
    email: {
      subject: `Refund initiated for order ${data.orderNumber}`,
      html: await render(
        <EmailLayout previewText="Your refund is on its way" heading="Refund initiated">
          <Text style={emailTextStyle}>
            A refund of {amount} for order <strong>{data.orderNumber}</strong> has been initiated.
            It typically settles in 5–7 business days.
          </Text>
          <Text style={emailTextStyle}>
            <a href={link}>View order</a>
          </Text>
        </EmailLayout>,
      ),
    },
  };
}
