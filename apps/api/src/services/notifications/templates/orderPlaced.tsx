import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface OrderPlacedData {
  orderNumber: string;
  pickupDate: string;
  pickupWindow: string;
  grandTotal: number;
  paymentMethod: 'online' | 'cod' | 'wallet';
  webAppUrl: string;
}

export async function buildOrderPlacedNotification(
  data: OrderPlacedData,
): Promise<NotificationContent> {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  const total = `₹${(data.grandTotal / 100).toFixed(0)}`;

  return {
    inApp: {
      title: 'Order placed',
      body: `Order ${data.orderNumber} is confirmed. Pickup ${data.pickupDate}, ${data.pickupWindow}.`,
    },
    email: {
      subject: `Your Clenzy order ${data.orderNumber} is confirmed`,
      html: await render(
        <EmailLayout previewText="Your order is confirmed" heading="Order confirmed">
          <Text style={emailTextStyle}>
            Order <strong>{data.orderNumber}</strong> is confirmed
            {data.paymentMethod === 'cod' ? ' — pay on delivery.' : ' — payment received.'}
          </Text>
          <Text style={emailTextStyle}>
            Pickup: {data.pickupDate}, {data.pickupWindow}
            <br />
            Total: {total}
          </Text>
          <Text style={emailTextStyle}>
            <a href={link}>Track your order</a>
          </Text>
        </EmailLayout>,
      ),
    },
    sms: {
      text: `Clenzy: Order ${data.orderNumber} confirmed. Pickup ${data.pickupDate}, ${data.pickupWindow}. Track: ${link}`,
      variables: {
        orderNumber: data.orderNumber,
        pickupDate: data.pickupDate,
        pickupWindow: data.pickupWindow,
        link,
      },
    },
  };
}
