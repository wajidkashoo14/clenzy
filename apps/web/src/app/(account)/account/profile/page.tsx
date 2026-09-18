import type { Metadata } from 'next';
import { ProfileContent } from '@/features/profile/ProfileContent';

export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileContent />;
}
