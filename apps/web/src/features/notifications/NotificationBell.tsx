'use client';

import type { NotificationPayload } from '@clenzy/shared';
import * as Popover from '@radix-ui/react-popover';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';

const POLL_INTERVAL_MS = 60_000;

function notificationHref(notification: NotificationPayload): string | null {
  const orderNumber = (notification.data as { orderNumber?: string } | undefined)?.orderNumber;
  return orderNumber ? `/account/orders/${orderNumber}` : null;
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: NotificationPayload;
  onRead: (id: string) => void;
}): ReactNode {
  const isUnread = !notification.readAt;
  const href = notificationHref(notification);

  function handleClick(): void {
    if (isUnread) onRead(notification.id);
  }

  const content = (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-md px-3 py-2.5 text-left',
        isUnread ? 'bg-primary-soft' : 'hover:bg-surface-alt',
      )}
    >
      <div className="flex items-center gap-2">
        {isUnread && (
          <span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden="true" />
        )}
        <span className="text-text text-sm font-medium">{notification.title}</span>
      </div>
      <p className="text-text-muted text-[13px]">{notification.body}</p>
      <p className="text-text-muted text-[11px]">{formatDateTime(notification.createdAt)}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={handleClick} className="block">
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={handleClick} className="block w-full">
      {content}
    </button>
  );
}

export function NotificationBell(): ReactNode {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationPayload[] | null>(null);

  useEffect(() => {
    function refreshCount(): void {
      getUnreadCount()
        .then(({ count }) => setUnreadCount(count))
        .catch(() => {
          // Silent — the badge just stays at its last known value.
        });
    }
    refreshCount();
    const interval = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    listNotifications()
      .then((result) => setNotifications(result.notifications))
      .catch(() => setNotifications([]));
  }, [open]);

  function handleRead(id: string): void {
    setNotifications(
      (current) =>
        current?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)) ??
        current,
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    markNotificationRead(id).catch((err: unknown) => {
      // Best-effort — the read state already reflects optimistically; a failed sync just means
      // the next full list refresh will correct it if needed.
      if (err instanceof ApiError) return;
    });
  }

  function handleMarkAllRead(): void {
    setNotifications(
      (current) =>
        current?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? current,
    );
    setUnreadCount(0);
    markAllNotificationsRead().catch(() => {
      // Best-effort, same as above.
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          className="text-text duration-fast ease-standard hover:bg-surface-alt focus-visible:shadow-focus relative flex size-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none"
        >
          <Bell className="size-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="bg-accent text-text absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="border-border bg-surface z-50 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-lg border shadow-lg"
        >
          <div className="border-border flex items-center justify-between border-b px-3 py-2.5">
            <p className="text-text text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-primary text-[13px] font-medium hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {notifications === null && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}
            {notifications !== null && notifications.length === 0 && (
              <p className="text-text-muted px-3 py-8 text-center text-sm">
                You&rsquo;re all caught up.
              </p>
            )}
            {notifications?.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onRead={handleRead}
              />
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
