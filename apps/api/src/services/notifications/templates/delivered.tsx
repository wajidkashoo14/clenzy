import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface DeliveredData {
  orderNumber: string;
  grandTotal: number;
  webAppUrl: string;
}

export async function buildDeliveredNotification(
  data: DeliveredData,
): Promise<NotificationContent> {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  const total = `₹${(data.grandTotal / 100).toFixed(0)}`;
  return {
    inApp: {
      title: 'Order delivered',
      body: `Order ${data.orderNumber} has been delivered. Total: ${total}.`,
    },
    email: {
      subject: `Your Clenzy order ${data.orderNumber} is delivered — invoice inside`,
      html: await render(
        <EmailLayout previewText="Your order has been delivered" heading="Delivered">
          <Text style={emailTextStyle}>
            Order <strong>{data.orderNumber}</strong> has been delivered. Total paid: {total}.
          </Text>
          <Text style={emailTextStyle}>
            Noticed an issue? You can request a free re-clean within 72 hours of delivery.
          </Text>
          <Text style={emailTextStyle}>
            <a href={link}>View order &amp; invoice</a>
          </Text>
        </EmailLayout>,
      ),
    },
  };
}
