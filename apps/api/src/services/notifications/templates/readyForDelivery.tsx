import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface ReadyForDeliveryData {
  orderNumber: string;
  deliveryDate: string;
  deliveryWindow: string;
  webAppUrl: string;
}

export async function buildReadyForDeliveryNotification(
  data: ReadyForDeliveryData,
): Promise<NotificationContent> {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  return {
    inApp: {
      title: 'Ready for delivery',
      body: `Order ${data.orderNumber} is ready. Delivery ${data.deliveryDate}, ${data.deliveryWindow}.`,
    },
    email: {
      subject: `Order ${data.orderNumber} is ready for delivery`,
      html: await render(
        <EmailLayout previewText="Your order is ready" heading="Ready for delivery">
          <Text style={emailTextStyle}>
            Order <strong>{data.orderNumber}</strong> is cleaned and ready. Delivery is scheduled
            for {data.deliveryDate}, {data.deliveryWindow}.
          </Text>
          <Text style={emailTextStyle}>
            <a href={link}>Track your order</a>
          </Text>
        </EmailLayout>,
      ),
    },
  };
}
