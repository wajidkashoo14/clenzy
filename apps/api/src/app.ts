import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { sanitizeRequest } from './middlewares/sanitize.js';
import { addressesRouter } from './routes/addresses.route.js';
import { areasRouter } from './routes/areas.route.js';
import { authRouter } from './routes/auth.route.js';
import { cartRouter } from './routes/cart.route.js';
import { catalogRouter } from './routes/catalog.route.js';
import { couponsRouter } from './routes/coupons.route.js';
import { formsRouter } from './routes/forms.route.js';
import { healthRouter } from './routes/health.route.js';
import { ordersRouter } from './routes/orders.route.js';
import { slotsRouter } from './routes/slots.route.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );

  // NOTE: the Razorpay webhook route (added in Phase 8) needs the raw request
  // body for signature verification and MUST be mounted before this JSON
  // parser — see docs/API_SPEC.md §8 and docs/PAYMENTS_AND_NOTIFICATIONS.md §1.3.
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(sanitizeRequest);
  app.use(hpp());

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        const id = typeof existing === 'string' ? existing : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
    }),
  );

  // Global rate limit — per-route limits (auth, orders, etc.) are added as
  // those features land. See docs/API_SPEC.md §11.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use('/api/v1', healthRouter);
  app.use('/api/v1', formsRouter);
  app.use('/api/v1', catalogRouter);
  app.use('/api/v1/areas', areasRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/addresses', addressesRouter);
  app.use('/api/v1/slots', slotsRouter);
  app.use('/api/v1/coupons', couponsRouter);
  app.use('/api/v1/orders', ordersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
