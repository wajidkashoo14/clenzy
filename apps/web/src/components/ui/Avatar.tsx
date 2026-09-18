import Image from 'next/image';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const sizeClasses = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
} as const;

export interface AvatarProps {
  name: string;
  src?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps): ReactNode {
  return (
    <span
      className={cn(
        'bg-primary-soft text-primary relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        sizeClasses[size],
        className,
      )}
    >
      {src ? (
        <Image src={src} alt="" fill sizes="56px" className="object-cover" />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
