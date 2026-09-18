import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

export interface RecleanAcceptedData {
  parentOrderNumber: string;
  recleanOrderNumber: string;
  pickupDate: string;
  webAppUrl: string;
}

export async function buildRecleanAcceptedNotification(
  data: RecleanAcceptedData,
): Promise<NotificationContent> {
  const link = orderTrackLink(data.recleanOrderNumber, data.webAppUrl);
  return {
    inApp: {
      title: 'Re-clean accepted',
      body: `Your free re-clean for order ${data.parentOrderNumber} is booked as ${data.recleanOrderNumber}.`,
    },
    email: {
      subject: `Your Clenzy re-clean is booked — ${data.recleanOrderNumber}`,
      html: await render(
        <EmailLayout previewText="Your free re-clean is booked" heading="Re-clean accepted">
          <Text style={emailTextStyle}>
            Your free re-clean for order <strong>{data.parentOrderNumber}</strong> is booked as{' '}
            <strong>{data.recleanOrderNumber}</strong>, with pickup on {data.pickupDate}. No charge.
          </Text>
          <Text style={emailTextStyle}>
            <a href={link}>Track your re-clean</a>
          </Text>
        </EmailLayout>,
      ),
    },
  };
}
