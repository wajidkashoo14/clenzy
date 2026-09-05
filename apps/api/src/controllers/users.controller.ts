import { updateProfileInputSchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as usersService from '../services/users.service.js';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getProfile(req.user!.id);
  res.status(200).json({ success: true, data: { user } });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const input = updateProfileInputSchema.parse(req.body);
  const user = await usersService.updateProfile(req.user!.id, input);
  res.status(200).json({ success: true, data: { user } });
});
