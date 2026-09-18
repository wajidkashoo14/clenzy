import type { ChangeUserRoleInput, CreateAgentInput, UpdateAgentInput } from '@clenzy/shared';
import { isValidObjectId, Types } from 'mongoose';
import { Order } from '../models/Order.js';
import { User, type UserDocument } from '../models/User.js';
import { logAudit } from './auditLog.service.js';
import { AppError } from '../utils/AppError.js';
import { normalizePhoneIN } from '../utils/phone.js';
import { nowInKolkata } from '../utils/timezone.js';

type UserLean = UserDocument & { _id: unknown };

interface Actor {
  id: string;
  role: string;
}

export interface AgentWorkload {
  tasksToday: number;
  completedToday: number;
  failedToday: number;
  /** Completed pickups + deliveries over the last 30 days, divided by 30. */
  avgPerDay: number;
}

const PRE_PICKUP_STATUSES = ['CONFIRMED', 'PICKUP_SCHEDULED'];

async function getAgentWorkload(agentId: unknown): Promise<AgentWorkload> {
  const today = nowInKolkata().dateString;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [pickupsToday, deliveriesToday, completedPickups30d, completedDeliveries30d] =
    await Promise.all([
      Order.find({ assignedPickupAgentId: agentId, 'pickupSlot.date': today })
        .select('status')
        .lean(),
      Order.find({ assignedDeliveryAgentId: agentId, 'deliverySlot.date': today })
        .select('status')
        .lean(),
      Order.countDocuments({
        assignedPickupAgentId: agentId,
        status: { $nin: [...PRE_PICKUP_STATUSES, 'PICKUP_FAILED'] },
        createdAt: { $gte: thirtyDaysAgo },
      }),
      Order.countDocuments({
        assignedDeliveryAgentId: agentId,
        status: { $in: ['DELIVERED', 'COMPLETED'] },
        updatedAt: { $gte: thirtyDaysAgo },
      }),
    ]);

  const completedToday =
    pickupsToday.filter(
      (o) => !PRE_PICKUP_STATUSES.includes(o.status) && o.status !== 'PICKUP_FAILED',
    ).length + deliveriesToday.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status)).length;
  const failedToday =
    pickupsToday.filter((o) => o.status === 'PICKUP_FAILED').length +
    deliveriesToday.filter((o) => o.status === 'DELIVERY_FAILED').length;

  return {
    tasksToday: pickupsToday.length + deliveriesToday.length,
    completedToday,
    failedToday,
    avgPerDay: Math.round(((completedPickups30d + completedDeliveries30d) / 30) * 10) / 10,
  };
}

export async function listAgentsAdmin(): Promise<(UserLean & { workload: AgentWorkload })[]> {
  const agents = await User.find({ role: 'agent' }).sort({ name: 1 }).lean();
  return Promise.all(
    agents.map(async (agent) => ({ ...agent, workload: await getAgentWorkload(agent._id) })),
  );
}

export async function createAgent(actor: Actor, input: CreateAgentInput): Promise<UserLean> {
  const phone = normalizePhoneIN(input.phone);
  if (!phone) throw AppError.badRequest('INVALID_PHONE', 'Enter a valid phone number.');

  const existing = await User.findOne({ phone }).lean();
  if (existing)
    throw AppError.badRequest('PHONE_TAKEN', 'A user with this phone number already exists.');

  const user = await User.create({
    phone,
    phoneVerified: true,
    name: input.name,
    role: 'agent',
    staffProfile: {
      employeeId: input.employeeId,
      assignedAreas: input.assignedAreas,
      vehicleNumber: input.vehicleNumber,
      isAvailable: true,
      shiftStart: input.shiftStart,
      shiftEnd: input.shiftEnd,
      joinedAt: new Date(),
    },
  });

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'agent.create',
    entityType: 'User',
    entityId: String(user._id),
    after: user.toObject(),
  });
  return user.toObject();
}

export async function updateAgent(
  actor: Actor,
  id: string,
  input: UpdateAgentInput,
): Promise<UserLean> {
  if (!isValidObjectId(id)) throw AppError.notFound('Agent not found.');
  const user = await User.findOne({ _id: id, role: 'agent' });
  if (!user) throw AppError.notFound('Agent not found.');

  const before = user.toObject();
  if (input.name !== undefined) user.name = input.name;
  user.staffProfile = {
    ...user.staffProfile,
    assignedAreas: user.staffProfile?.assignedAreas ?? [],
    isAvailable: user.staffProfile?.isAvailable ?? true,
    ...(input.employeeId !== undefined ? { employeeId: input.employeeId } : {}),
    ...(input.assignedAreas !== undefined
      ? { assignedAreas: input.assignedAreas.map((areaId) => new Types.ObjectId(areaId)) }
      : {}),
    ...(input.vehicleNumber !== undefined ? { vehicleNumber: input.vehicleNumber } : {}),
    ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
    ...(input.shiftStart !== undefined ? { shiftStart: input.shiftStart } : {}),
    ...(input.shiftEnd !== undefined ? { shiftEnd: input.shiftEnd } : {}),
  };
  await user.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'agent.update',
    entityType: 'User',
    entityId: id,
    before,
    after: user.toObject(),
  });
  return user.toObject();
}

/** SUPERADMIN only — see docs/API_SPEC.md §10 and docs/ADMIN_DASHBOARD.md §10. */
export async function changeUserRole(
  actor: Actor,
  userId: string,
  input: ChangeUserRoleInput,
): Promise<UserLean> {
  if (!isValidObjectId(userId)) throw AppError.notFound('User not found.');
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('User not found.');

  const before = user.toObject();
  user.role = input.role;
  await user.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'user.change-role',
    entityType: 'User',
    entityId: userId,
    before,
    after: user.toObject(),
  });
  return user.toObject();
}
