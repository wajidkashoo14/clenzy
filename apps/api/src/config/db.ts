import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

mongoose.set('strictQuery', true);

/**
 * Connects to MongoDB with retry-with-backoff. A replica set (Atlas, even the
 * free M0 tier) is required — this application relies on multi-document
 * transactions for order placement. See docs/DATABASE.md §0 and
 * docs/ARCHITECTURE.md §3.
 */
export async function connectDatabase(retriesLeft = MAX_RETRIES): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
  } catch (error) {
    if (retriesLeft <= 0) {
      logger.error({ err: error }, 'MongoDB connection failed — no retries left, exiting');
      throw error;
    }
    logger.warn(
      { err: error, retriesLeft },
      `MongoDB connection failed — retrying in ${RETRY_DELAY_MS}ms`,
    );
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    await connectDatabase(retriesLeft - 1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});
