import {
  Footprints,
  Home,
  Layers,
  Package,
  Shirt,
  ShirtIcon,
  Sofa,
  Sparkles,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Maps the icon name string stored on `serviceCategories.icon` (see
 * docs/DATABASE.md) to the actual Lucide component. The catalog API returns
 * a plain string since Mongo can't store a component reference.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Shirt,
  ShirtIcon,
  Sparkles,
  Wind,
  Footprints,
  Layers,
  Sofa,
  Home,
};

/**
 * Renders the icon directly rather than returning the component reference —
 * assigning a looked-up component to a variable and using it as a JSX tag
 * (`const Icon = resolveIcon(...); <Icon />`) trips the `react-hooks/
 * static-components` lint rule, which can't distinguish a static map lookup
 * from actually defining a new component during render.
 */
export function renderIcon(name: string, className: string): ReactNode {
  const Icon = ICON_MAP[name] ?? Package;
  return <Icon className={className} aria-hidden="true" />;
}
