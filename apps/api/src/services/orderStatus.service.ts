import type { OrderStatus, Role } from '@clenzy/shared';
import { Types, type ClientSession, type HydratedDocument } from 'mongoose';
import { logger } from '../config/logger.js';
import type { OrderDocument } from '../models/Order.js';
import { notifyOrderStatusChange } from './notifications/orderStatusNotifications.js';
import { AppError } from '../utils/AppError.js';

/** A transition can be performed by a real user role, or by the server itself (webhooks, crons). */
export type TransitionActor = Role | 'system';

interface TransitionRule {
  to: OrderStatus;
  actors: TransitionActor[];
}

/**
 * The single source of truth for legal order-status transitions — see
 * docs/PAYMENTS_AND_NOTIFICATIONS.md §2 and §2.1. Every status change in
 * this codebase must go through `changeStatus()` below; nothing else may
 * assign `order.status` directly.
 *
 * Recovery paths (PICKUP_FAILED → PICKUP_SCHEDULED, DELIVERY_FAILED →
 * OUT_FOR_DELIVERY) and the post-pickup admin-only cancel/refund paths come
 * from the lifecycle diagram in §2, which isn't fully captured by the §2.1
 * table alone.
 */
const TRANSITIONS: Record<OrderStatus, TransitionRule[]> = {
  PENDING_PAYMENT: [
    { to: 'PLACED', actors: ['system'] },
    { to: 'CANCELLED', actors: ['customer', 'admin', 'system'] },
  ],
  PLACED: [
    { to: 'CONFIRMED', actors: ['staff', 'admin'] },
    { to: 'CANCELLED', actors: ['customer', 'staff', 'admin'] },
  ],
  CONFIRMED: [
    { to: 'PICKUP_SCHEDULED', actors: ['staff', 'admin', 'system'] },
    { to: 'CANCELLED', actors: ['customer', 'staff', 'admin'] },
  ],
  PICKUP_SCHEDULED: [
    { to: 'PICKED_UP', actors: ['agent', 'staff', 'admin'] },
    { to: 'PICKUP_FAILED', actors: ['agent', 'staff', 'admin'] },
    { to: 'CANCELLED', actors: ['customer', 'staff', 'admin'] },
  ],
  PICKUP_FAILED: [
    // Reschedule after a failed pickup.
    { to: 'PICKUP_SCHEDULED', actors: ['customer', 'staff', 'admin'] },
    // 2 failures → auto-cancel; see the `failedPickupAttempts` guard in orders.service.ts's agent handler.
    { to: 'CANCELLED', actors: ['staff', 'admin', 'system'] },
  ],
  PICKED_UP: [
    { to: 'PROCESSING', actors: ['staff', 'admin'] },
    { to: 'CANCELLED', actors: ['admin'] },
  ],
  PROCESSING: [
    { to: 'QUALITY_CHECK', actors: ['staff', 'admin'] },
    { to: 'CANCELLED', actors: ['admin'] },
  ],
  QUALITY_CHECK: [
    { to: 'PROCESSING', actors: ['staff', 'admin'] }, // rework
    { to: 'READY', actors: ['staff', 'admin'] },
    { to: 'CANCELLED', actors: ['admin'] },
  ],
  READY: [
    { to: 'OUT_FOR_DELIVERY', actors: ['agent', 'staff', 'admin'] },
    { to: 'CANCELLED', actors: ['admin'] },
  ],
  OUT_FOR_DELIVERY: [
    { to: 'DELIVERED', actors: ['agent', 'staff', 'admin'] },
    { to: 'DELIVERY_FAILED', actors: ['agent', 'staff', 'admin'] },
    { to: 'CANCELLED', actors: ['admin'] },
  ],
  DELIVERY_FAILED: [
    // Reschedule after a failed delivery.
    { to: 'OUT_FOR_DELIVERY', actors: ['customer', 'staff', 'admin'] },
    { to: 'CANCELLED', actors: ['admin'] },
  ],
  DELIVERED: [
    { to: 'COMPLETED', actors: ['admin', 'system'] }, // system: auto-complete cron
    { to: 'REFUND_PENDING', actors: ['admin'] }, // e.g. damaged-item compensation
    { to: 'CANCELLED', actors: ['admin'] },
  ],
  COMPLETED: [{ to: 'REFUND_PENDING', actors: ['admin'] }],
  REFUND_PENDING: [{ to: 'REFUNDED', actors: ['admin', 'system'] }],
  CANCELLED: [], // terminal
  REFUNDED: [], // terminal
};

export function assertTransitionAllowed(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
): void {
  const rule = TRANSITIONS[from].find((r) => r.to === to);
  if (!rule) {
    throw AppError.unprocessable(
      'INVALID_STATUS_TRANSITION',
      `An order cannot move from ${from} to ${to}.`,
    );
  }
  // superadmin outranks admin everywhere — the transition map only lists 'admin' explicitly.
  const effectiveActor = actor === 'superadmin' ? 'admin' : actor;
  if (!rule.actors.includes(effectiveActor)) {
    throw AppError.forbidden(`"${actor}" cannot move an order from ${from} to ${to}.`);
  }
}

export interface ChangeStatusOptions {
  actorUserId?: string;
  note?: string;
  session?: ClientSession;
}

/**
 * The one function every status change goes through — see
 * docs/PAYMENTS_AND_NOTIFICATIONS.md §2.1: "Never let a controller write
 * `order.status` directly." Mutates and saves the passed-in document;
 * callers control the session/transaction it runs in.
 *
 * Notification triggers hook in here — see
 * docs/PAYMENTS_AND_NOTIFICATIONS.md §3.3: never send a notification inside
 * a database transaction, since a later rollback can't un-send it. When the
 * caller passes a `session` (it's inside `session.withTransaction(...)`),
 * this deliberately skips notifying — that caller must call
 * `notifyOrderStatusChange(order, to)` itself once its transaction commits.
 */
export async function changeStatus(
  order: HydratedDocument<OrderDocument>,
  to: OrderStatus,
  actor: TransitionActor,
  opts: ChangeStatusOptions = {},
): Promise<void> {
  assertTransitionAllowed(order.status, to, actor);

  order.status = to;
  order.statusHistory.push({
    status: to,
    changedBy: opts.actorUserId ? new Types.ObjectId(opts.actorUserId) : undefined,
    changedByRole: actor,
    note: opts.note,
    at: new Date(),
  });

  if (to === 'DELIVERED') order.deliveredAt = new Date();
  if (to === 'COMPLETED') order.completedAt = new Date();

  await order.save(opts.session ? { session: opts.session } : undefined);

  if (!opts.session) {
    notifyOrderStatusChange(order, to).catch((err: unknown) => {
      logger.error({ err, orderNumber: order.orderNumber, to }, 'notifyOrderStatusChange failed');
    });
  }
}
