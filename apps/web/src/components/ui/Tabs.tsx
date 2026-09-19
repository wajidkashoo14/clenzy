'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { createContext, useContext, useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { transitions } from '@/lib/motion';

interface TabsContextValue {
  activeValue: string | undefined;
  instanceId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used inside <Tabs>');
  return ctx;
}

export type TabsProps = TabsPrimitive.TabsProps;

/** Per docs/DESIGN_SYSTEM.md — micro-interaction: active pill slides via a shared `layoutId`. */
export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: TabsProps): ReactNode {
  const instanceId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeValue = value ?? internalValue;

  return (
    <TabsPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        setInternalValue(next);
        onValueChange?.(next);
      }}
      {...props}
    >
      <TabsContext.Provider value={{ activeValue, instanceId }}>{children}</TabsContext.Provider>
    </TabsPrimitive.Root>
  );
}

export function TabsList({ className, ...props }: TabsPrimitive.TabsListProps): ReactNode {
  return (
    <TabsPrimitive.List
      className={cn(
        'bg-surface-alt flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1',
        className,
      )}
      {...props}
    />
  );
}

export type TabsTriggerProps = TabsPrimitive.TabsTriggerProps;

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps): ReactNode {
  const { activeValue, instanceId } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'relative rounded-full px-4 py-1.5 text-sm font-medium',
        'duration-fast ease-standard transition-colors',
        'focus-visible:shadow-focus focus-visible:outline-none',
        isActive ? 'text-text-inverse' : 'text-text-muted hover:text-text',
        className,
      )}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId={`tabs-active-pill-${instanceId}`}
          className="bg-primary shadow-glow absolute inset-0 -z-10 rounded-full"
          transition={transitions.spring}
        />
      )}
      <span className="relative">{children}</span>
    </TabsPrimitive.Trigger>
  );
}

export type TabsContentProps = TabsPrimitive.TabsContentProps;

export function TabsContent({ className, ...props }: TabsContentProps): ReactNode {
  return (
    <TabsPrimitive.Content
      className={cn('focus-visible:shadow-focus mt-4 focus-visible:outline-none', className)}
      {...props}
    />
  );
}
