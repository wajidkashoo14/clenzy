import { addressInputSchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as addressesService from '../services/addresses.service.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await addressesService.listAddresses(req.user!.id);
  res.status(200).json({ success: true, data: { addresses } });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = addressInputSchema.parse(req.body);
  const address = await addressesService.createAddress(req.user!.id, input);
  res.status(201).json({ success: true, data: { address } });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const address = await addressesService.getAddress(
    req.user!.id,
    requireParam(req.params.id, 'id'),
  );
  res.status(200).json({ success: true, data: { address } });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = addressInputSchema.partial().parse(req.body);
  const address = await addressesService.updateAddress(
    req.user!.id,
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { address } });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await addressesService.deleteAddress(req.user!.id, requireParam(req.params.id, 'id'));
  res.status(200).json({ success: true, data: { deleted: true } });
});

export const setDefault = asyncHandler(async (req: Request, res: Response) => {
  const address = await addressesService.setDefaultAddress(
    req.user!.id,
    requireParam(req.params.id, 'id'),
  );
  res.status(200).json({ success: true, data: { address } });
});
