import { auditLogQuerySchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { listAuditLogs } from '../services/adminAuditLog.service.js';

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const query = auditLogQuerySchema.parse(req.query);
  const result = await listAuditLogs(query);
  res.status(200).json({ success: true, data: result });
});
