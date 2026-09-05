import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface PickupDeliveryFailedData {
  orderNumber: string;
  type: 'pickup' | 'delivery';
  reason: string;
  webAppUrl: string;
}

export async function buildPickupDeliveryFailedNotification(
  data: PickupDeliveryFailedData,
): Promise<NotificationContent> {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  const label = data.type === 'pickup' ? 'Pickup' : 'Delivery';
  return {
    inApp: {
      title: `${label} failed`,
      body: `${label} for order ${data.orderNumber} failed — ${data.reason}. Please reschedule.`,
    },
    email: {
      subject: `${label} failed for order ${data.orderNumber}`,
      html: await render(
        <EmailLayout
          previewText={`Your ${data.type} could not be completed`}
          heading={`${label} failed`}
        >
          <Text style={emailTextStyle}>
            {label} for order <strong>{data.orderNumber}</strong> could not be completed —{' '}
            {data.reason}.
          </Text>
          <Text style={emailTextStyle}>
            <a href={link}>Reschedule now</a>
          </Text>
        </EmailLayout>,
      ),
    },
    sms: {
      text: `Clenzy: ${label} failed for order ${data.orderNumber} — ${data.reason}. Reschedule: ${link}`,
      variables: { orderNumber: data.orderNumber, type: data.type, link },
    },
  };
}
