import {
  changeUserRoleInputSchema,
  createAgentInputSchema,
  updateAgentInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import * as adminStaffService from '../services/adminStaff.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}
function actorOf(req: Request) {
  return { id: req.user!.id, role: req.user!.role };
}

export const listAgents = asyncHandler(async (_req: Request, res: Response) => {
  const agents = await adminStaffService.listAgentsAdmin();
  res.status(200).json({ success: true, data: { agents } });
});

export const createAgent = asyncHandler(async (req: Request, res: Response) => {
  const input = createAgentInputSchema.parse(req.body);
  const agent = await adminStaffService.createAgent(actorOf(req), input);
  res.status(201).json({ success: true, data: { agent } });
});

export const updateAgent = asyncHandler(async (req: Request, res: Response) => {
  const input = updateAgentInputSchema.parse(req.body);
  const agent = await adminStaffService.updateAgent(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { agent } });
});

export const changeUserRole = asyncHandler(async (req: Request, res: Response) => {
  const input = changeUserRoleInputSchema.parse(req.body);
  const user = await adminStaffService.changeUserRole(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { user } });
});
