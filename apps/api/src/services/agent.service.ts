import type {
  AgentTask,
  MarkDeliveredInput,
  MarkFailedInput,
  MarkPickedUpInput,
} from '@clenzy/shared';
import { Order, type OrderDocument } from '../models/Order.js';
import { changeStatus } from './orderStatus.service.js';
import { AppError } from '../utils/AppError.js';

type OrderLean = OrderDocument & { _id: unknown };

/** Auto-cancel thresholds — pickup's "2 failures" is confirmed (docs/PAYMENTS_AND_NOTIFICATIONS.md §2); delivery's isn't specified, so 3 is a placeholder. */
const MAX_PICKUP_FAILURES = 2;
const MAX_DELIVERY_FAILURES = 3;

function toAgentTask(order: OrderLean, type: 'pickup' | 'delivery'): AgentTask {
  const address = type === 'pickup' ? order.pickupAddress : order.deliveryAddress;
  const slot = type === 'pickup' ? order.pickupSlot : order.deliverySlot;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    type,
    window: slot.window,
    address: {
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      line1: address.line1,
      line2: address.line2,
      landmark: address.landmark,
      area: address.area,
      city: address.city,
      pincode: address.pincode,
    },
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    customerNote: order.customerNote,
  };
}

/** See docs/API_SPEC.md §10 — GET /agent/tasks?date=. */
export async function getAgentTasks(agentId: string, date: string): Promise<AgentTask[]> {
  const [pickups, deliveries] = await Promise.all([
    Order.find({
      assignedPickupAgentId: agentId,
      'pickupSlot.date': date,
      status: 'PICKUP_SCHEDULED',
    })
      .sort({ 'pickupSlot.window': 1 })
      .lean(),
    Order.find({
      assignedDeliveryAgentId: agentId,
      'deliverySlot.date': date,
      status: 'OUT_FOR_DELIVERY',
    })
      .sort({ 'deliverySlot.window': 1 })
      .lean(),
  ]);

  return [
    ...pickups.map((o) => toAgentTask(o, 'pickup')),
    ...deliveries.map((o) => toAgentTask(o, 'delivery')),
  ];
}

async function requireAssignedOrder(
  agentId: string,
  orderNumber: string,
  field: 'assignedPickupAgentId' | 'assignedDeliveryAgentId',
) {
  const order = await Order.findOne({ orderNumber, [field]: agentId });
  if (!order) throw AppError.notFound('Task not found.');
  return order;
}

/** See docs/API_SPEC.md §10 — PATCH /agent/tasks/:orderId/picked-up. `actualItems`/`photos` aren't persisted yet (no Cloudinary integration — V2 per docs/DATABASE.md's `pickupPhotos` note). */
export async function markPickedUp(
  agentId: string,
  orderNumber: string,
  _input: MarkPickedUpInput,
): Promise<void> {
  const order = await requireAssignedOrder(agentId, orderNumber, 'assignedPickupAgentId');
  await changeStatus(order, 'PICKED_UP', 'agent', { actorUserId: agentId });
}

/** See docs/API_SPEC.md §10 — PATCH /agent/tasks/:orderId/delivered. */
export async function markDelivered(
  agentId: string,
  orderNumber: string,
  _input: MarkDeliveredInput,
): Promise<void> {
  const order = await requireAssignedOrder(agentId, orderNumber, 'assignedDeliveryAgentId');
  await changeStatus(order, 'DELIVERED', 'agent', { actorUserId: agentId });
}

/** See docs/API_SPEC.md §10 — PATCH /agent/tasks/:orderId/failed. Auto-cancels after the failure cap. */
export async function markFailed(
  agentId: string,
  orderNumber: string,
  input: MarkFailedInput,
): Promise<void> {
  const field = input.type === 'pickup' ? 'assignedPickupAgentId' : 'assignedDeliveryAgentId';
  const order = await requireAssignedOrder(agentId, orderNumber, field);

  if (input.type === 'pickup') {
    order.failedPickupAttempts += 1;
    await changeStatus(order, 'PICKUP_FAILED', 'agent', {
      actorUserId: agentId,
      note: input.reason,
    });
    if (order.failedPickupAttempts >= MAX_PICKUP_FAILURES) {
      await changeStatus(order, 'CANCELLED', 'system', {
        note: `Auto-cancelled after ${MAX_PICKUP_FAILURES} failed pickup attempts`,
      });
    }
  } else {
    order.failedDeliveryAttempts += 1;
    await changeStatus(order, 'DELIVERY_FAILED', 'agent', {
      actorUserId: agentId,
      note: input.reason,
    });
    if (order.failedDeliveryAttempts >= MAX_DELIVERY_FAILURES) {
      // "Held at facility" per the lifecycle diagram — no dedicated status; ops resolves manually via internal notes.
      order.internalNotes.push({
        note: `${MAX_DELIVERY_FAILURES} failed delivery attempts — held at facility pending manual resolution`,
        at: new Date(),
      });
      await order.save();
    }
  }
}
