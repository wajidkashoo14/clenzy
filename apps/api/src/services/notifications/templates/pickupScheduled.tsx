import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface PickupScheduledData {
  orderNumber: string;
  pickupDate: string;
  pickupWindow: string;
  agentName?: string;
  webAppUrl: string;
}

export async function buildPickupScheduledNotification(
  data: PickupScheduledData,
): Promise<NotificationContent> {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  const agentLine = data.agentName ? ` ${data.agentName} will handle your pickup.` : '';
  return {
    inApp: {
      title: 'Pickup scheduled',
      body: `Pickup for ${data.orderNumber} set for ${data.pickupDate}, ${data.pickupWindow}.${agentLine}`,
    },
    email: {
      subject: `Pickup scheduled for order ${data.orderNumber}`,
      html: await render(
        <EmailLayout previewText="Your pickup is scheduled" heading="Pickup scheduled">
          <Text style={emailTextStyle}>
            Pickup for order <strong>{data.orderNumber}</strong> is set for {data.pickupDate},{' '}
            {data.pickupWindow}.{agentLine}
          </Text>
          <Text style={emailTextStyle}>
            <a href={link}>Track your order</a>
          </Text>
        </EmailLayout>,
      ),
    },
  };
}
