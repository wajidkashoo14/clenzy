import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface PickedUpData {
  orderNumber: string;
  items: { name: string; quantity: number }[];
  webAppUrl: string;
}

export async function buildPickedUpNotification(data: PickedUpData): Promise<NotificationContent> {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  const itemLines = data.items.map((item) => `${item.name} × ${item.quantity}`).join(', ');
  return {
    inApp: {
      title: 'Items picked up',
      body: `We've picked up your items for order ${data.orderNumber}.`,
    },
    email: {
      subject: `Order ${data.orderNumber} picked up`,
      html: await render(
        <EmailLayout previewText="Your items have been picked up" heading="Items picked up">
          <Text style={emailTextStyle}>
            We&rsquo;ve picked up the following for order <strong>{data.orderNumber}</strong>:
          </Text>
          <Text style={emailTextStyle}>{itemLines}</Text>
          <Text style={emailTextStyle}>
            Keep this for reference in case of any dispute. <a href={link}>Track your order</a>
          </Text>
        </EmailLayout>,
      ),
    },
  };
}
