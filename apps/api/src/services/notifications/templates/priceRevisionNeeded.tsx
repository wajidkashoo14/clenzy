import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface PriceRevisionNeededData {
  orderNumber: string;
  originalTotal: number;
  revisedTotal: number;
  reason: string;
  webAppUrl: string;
}

export async function buildPriceRevisionNeededNotification(
  data: PriceRevisionNeededData,
): Promise<NotificationContent> {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  const original = `₹${(data.originalTotal / 100).toFixed(0)}`;
  const revised = `₹${(data.revisedTotal / 100).toFixed(0)}`;
  return {
    inApp: {
      title: 'Revised total needs your approval',
      body: `Order ${data.orderNumber}: total revised from ${original} to ${revised} — ${data.reason}`,
    },
    email: {
      subject: `Approval needed: revised total for order ${data.orderNumber}`,
      html: await render(
        <EmailLayout previewText="Your order's total has been revised" heading="Approval needed">
          <Text style={emailTextStyle}>
            The total for order <strong>{data.orderNumber}</strong> has changed from {original} to{' '}
            {revised} — {data.reason}
          </Text>
          <Text style={emailTextStyle}>
            Your order won&rsquo;t proceed until you approve this.{' '}
            <a href={link}>Review and approve</a>
          </Text>
        </EmailLayout>,
      ),
    },
    sms: {
      text: `Clenzy: Order ${data.orderNumber} total revised to ${revised}. Approve: ${link}`,
      variables: { orderNumber: data.orderNumber, revisedTotal: revised, link },
    },
  };
}
