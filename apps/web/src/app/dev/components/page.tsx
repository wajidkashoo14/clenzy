import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ComponentGallery } from './ComponentGallery';

export const metadata: Metadata = {
  title: 'Component Gallery — Dev',
  robots: { index: false, follow: false },
};

/** Dev-only — see docs/DEVELOPMENT_PLAN.md Phase 2. 404s in production so it never ships as a reachable route. */
export default function DevComponentsPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ComponentGallery />;
}
