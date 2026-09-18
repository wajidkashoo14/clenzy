import type { Metadata } from 'next';
import { AddressesContent } from '@/features/addresses/AddressesContent';

export const metadata: Metadata = {
  title: 'Your Addresses',
  robots: { index: false, follow: false },
};

export default function AddressesPage() {
  return <AddressesContent />;
}
