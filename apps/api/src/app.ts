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
import { adminRouter } from './routes/admin.route.js';
import { agentRouter } from './routes/agent.route.js';
import { areasRouter } from './routes/areas.route.js';
import { authRouter } from './routes/auth.route.js';
import { cartRouter } from './routes/cart.route.js';
import { catalogRouter } from './routes/catalog.route.js';
import { contentRouter } from './routes/content.route.js';
import { couponsRouter } from './routes/coupons.route.js';
import { devRouter } from './routes/dev.route.js';
import { formsRouter } from './routes/forms.route.js';
import { healthRouter } from './routes/health.route.js';
import { notificationsRouter } from './routes/notifications.route.js';
import { ordersRouter } from './routes/orders.route.js';
import { paymentsRouter } from './routes/payments.route.js';
import { reviewsRouter } from './routes/reviews.route.js';
import { slotsRouter } from './routes/slots.route.js';
import { usersRouter } from './routes/users.route.js';
import { webhooksRouter } from './routes/webhooks.route.js';

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

  // The Razorpay webhook route needs the RAW request body for HMAC signature
  // verification, and is exempt from rate limiting (verified by signature
  // instead — see docs/API_SPEC.md §11) — so it's mounted here, before the
  // JSON body parser, sanitizer, and rate limiter below all touch the
  // request. See docs/PAYMENTS_AND_NOTIFICATIONS.md §1.3.
  app.use('/api/v1/webhooks', webhooksRouter);

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(sanitizeRequest);
  app.use(hpp());

  // Global rate limit — per-route limits (auth, orders, etc.) are added as
  // those features land. See docs/API_SPEC.md §11.
  //
  // The dev limit is far higher than prod because in development EVERY
  // page load, HMR remount, and cart re-estimate from the same localhost IP
  // shares this single bucket — at the prod limit, normal dev usage (plus
  // tooling traffic) exhausts it within minutes and everything 429s for the
  // rest of the 15-minute window.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: process.env.NODE_ENV === 'production' ? 100 : 3000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use('/api/v1', healthRouter);
  app.use('/api/v1', formsRouter);
  app.use('/api/v1', catalogRouter);
  app.use('/api/v1/content', contentRouter);
  app.use('/api/v1/reviews', reviewsRouter);
  app.use('/api/v1/areas', areasRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/addresses', addressesRouter);
  app.use('/api/v1/slots', slotsRouter);
  app.use('/api/v1/coupons', couponsRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/agent', agentRouter);
  app.use('/api/v1/dev', devRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
