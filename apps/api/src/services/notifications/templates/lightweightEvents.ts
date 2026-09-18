import type { NotificationContent } from './types.js';
import { orderTrackLink } from './types.js';

/**
 * Events whose matrix row has no email — see
 * docs/PAYMENTS_AND_NOTIFICATIONS.md §3.2. Grouped in one file since each
 * builder is a couple of lines; splitting them into their own files would
 * be one-file-per-string, not one-file-per-template.
 */

export function buildOrderConfirmedNotification(data: {
  orderNumber: string;
}): NotificationContent {
  return {
    inApp: {
      title: 'Order confirmed',
      body: `Order ${data.orderNumber} has been confirmed by our team.`,
    },
  };
}

export function buildProcessingStartedNotification(data: {
  orderNumber: string;
}): NotificationContent {
  return {
    inApp: {
      title: 'Processing started',
      body: `Order ${data.orderNumber} is now being cleaned.`,
    },
  };
}

export function buildOrderCompletedNotification(data: {
  orderNumber: string;
}): NotificationContent {
  return {
    inApp: {
      title: 'Order completed',
      body: `Order ${data.orderNumber} is complete. Thanks for choosing Clenzy!`,
    },
  };
}

export function buildPickupReminderNotification(data: {
  orderNumber: string;
  pickupWindow: string;
}): NotificationContent {
  return {
    inApp: {
      title: 'Pickup tomorrow',
      body: `Pickup for order ${data.orderNumber} is tomorrow, ${data.pickupWindow}. Please keep items ready.`,
    },
    sms: {
      text: `Clenzy: Pickup tomorrow ${data.pickupWindow} for order ${data.orderNumber}. Please keep items ready.`,
      variables: { orderNumber: data.orderNumber, pickupWindow: data.pickupWindow },
    },
  };
}

export function buildOutForDeliveryNotification(data: {
  orderNumber: string;
  agentName?: string;
  agentPhone?: string;
  codAmount?: number;
  webAppUrl: string;
}): NotificationContent {
  const link = orderTrackLink(data.orderNumber, data.webAppUrl);
  const agentLine = data.agentName
    ? ` Agent ${data.agentName}${data.agentPhone ? `, ${data.agentPhone}` : ''}.`
    : '';
  const codLine = data.codAmount ? ` COD due: ₹${(data.codAmount / 100).toFixed(0)}.` : '';
  return {
    inApp: {
      title: 'Out for delivery',
      body: `Order ${data.orderNumber} is out for delivery.${agentLine}${codLine}`,
    },
    sms: {
      text: `Clenzy: Your order ${data.orderNumber} is out for delivery.${agentLine}${codLine}`,
      variables: {
        orderNumber: data.orderNumber,
        agentName: data.agentName ?? '',
        agentPhone: data.agentPhone ?? '',
        codAmount: data.codAmount ? `${(data.codAmount / 100).toFixed(0)}` : '',
        link,
      },
    },
  };
}
