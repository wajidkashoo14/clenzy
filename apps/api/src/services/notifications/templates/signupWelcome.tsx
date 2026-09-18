import { render } from '@react-email/render';
import { Text } from '@react-email/components';
import { EmailLayout, emailTextStyle } from './layout.js';
import type { NotificationContent } from './types.js';

export interface SignupWelcomeData {
  name?: string;
}

export async function buildSignupWelcomeNotification(
  data: SignupWelcomeData,
): Promise<NotificationContent> {
  const greeting = data.name ? `Hi ${data.name},` : 'Hi,';
  return {
    inApp: {
      title: 'Welcome to Clenzy',
      body: 'Your account is ready — book your first pickup whenever you like.',
    },
    email: {
      subject: 'Welcome to Clenzy',
      html: await render(
        <EmailLayout previewText="Welcome to Clenzy" heading="Welcome to Clenzy">
          <Text style={emailTextStyle}>{greeting}</Text>
          <Text style={emailTextStyle}>
            Thanks for signing up. You can book a pickup, track an order, and manage your addresses
            any time from your account.
          </Text>
        </EmailLayout>,
      ),
    },
  };
}
