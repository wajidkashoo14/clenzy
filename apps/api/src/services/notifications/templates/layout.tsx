import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

const BRAND_NAME = 'Clenzy';
const BRAND_COLOR = '#1f4d3a';

/**
 * One shared shell for every notification email — see
 * docs/PAYMENTS_AND_NOTIFICATIONS.md §3.3 "build templates with React
 * Email so markup is versioned/previewable locally". Individual templates
 * supply only the heading + body content; the brand header/footer stays
 * identical across every send.
 */
export function EmailLayout({
  previewText,
  heading,
  children,
}: {
  previewText: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: '#f5f4f0', fontFamily: 'Georgia, serif', margin: 0 }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 24px' }}>
          <Text
            style={{ color: BRAND_COLOR, fontSize: '20px', fontWeight: 'bold', margin: '0 0 24px' }}
          >
            {BRAND_NAME}
          </Text>
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '32px',
              border: '1px solid #e5e2d9',
            }}
          >
            <Heading style={{ fontSize: '18px', color: '#20211d', margin: '0 0 16px' }}>
              {heading}
            </Heading>
            {children}
          </Section>
          <Hr style={{ borderColor: '#e5e2d9', margin: '24px 0 16px' }} />
          <Text style={{ color: '#6b6a63', fontSize: '12px', margin: 0 }}>
            {BRAND_NAME} — doorstep laundry &amp; fabric care, Srinagar.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const emailTextStyle = { color: '#3d3c37', fontSize: '14px', lineHeight: '22px' };
export const emailLinkStyle = { color: BRAND_COLOR, fontWeight: 'bold' };
