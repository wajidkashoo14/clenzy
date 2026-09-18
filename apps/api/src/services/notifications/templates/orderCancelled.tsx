import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface OrderCancelledData {
  orderNumber: string;
  reason: string;
  refundEligible: boolean;
  webAppUrl: string;
}

export async function buildOrderCancelledNotification(
  data: OrderCancelledData,
): Promise<NotificationContent> {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  const refundLine = data.refundEligible
    ? ' A refund has been initiated and will settle in 5–7 business days.'
    : '';
  return {
    inApp: {
      title: 'Order cancelled',
      body: `Order ${data.orderNumber} was cancelled — ${data.reason}.${refundLine}`,
    },
    email: {
      subject: `Order ${data.orderNumber} cancelled`,
      html: await render(
        <EmailLayout previewText="Your order was cancelled" heading="Order cancelled">
          <Text style={emailTextStyle}>
            Order <strong>{data.orderNumber}</strong> was cancelled — {data.reason}.{refundLine}
          </Text>
          <Text style={emailTextStyle}>
            <a href={link}>View order</a>
          </Text>
        </EmailLayout>,
      ),
    },
    sms: {
      text: `Clenzy: Order ${data.orderNumber} cancelled.${refundLine} Details: ${link}`,
      variables: { orderNumber: data.orderNumber, link },
    },
  };
}
