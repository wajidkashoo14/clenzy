import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import type { HealthResponse } from '@clenzy/shared';

const SERVICE_NAME = 'clenzy-api';

export function getHealth(_req: Request, res: Response<HealthResponse>): void {
  res.status(200).json({
    status: 'ok',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
}

/** Readiness includes the database connection — used by deploy health checks. */
export function getReadiness(_req: Request, res: Response): void {
  const dbConnected = mongoose.connection.readyState === mongoose.ConnectionStates.connected;
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    data: { database: dbConnected ? 'connected' : 'disconnected' },
  });
}
